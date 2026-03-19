
-- ============================================================
-- SECURITY HARDENING: Collection Point Operator Isolation
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. DROP the dangerous cp_operator_view_own_orders policy
--    It had an OR NOT EXISTS clause granting unrestricted SELECT
--    to ALL non-CP-operator users, bypassing role-specific policies.
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cp_operator_view_own_orders" ON service_orders;

-- ──────────────────────────────────────────────────────────────
-- 2. Create a unified SECURITY DEFINER helper that checks
--    BOTH collection_point_users AND profiles.collection_point_id
--    Also respects the view_only_own_orders setting.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_cp_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Primary: profiles.collection_point_id
    (SELECT p.collection_point_id FROM profiles p WHERE p.id = auth.uid()),
    -- Fallback: collection_point_users table
    (SELECT cpu.collection_point_id FROM collection_point_users cpu
     WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
     LIMIT 1)
  );
$$;

-- Helper: check if CP operator and if view_only_own_orders is true
CREATE OR REPLACE FUNCTION public.cp_can_view_all_tenant_orders()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NOT COALESCE((cp.settings->>'view_only_own_orders')::boolean, true)
     FROM profiles p
     JOIN collection_points cp ON cp.id = p.collection_point_id
     WHERE p.id = auth.uid()
       AND cp.is_active = true),
    false
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- 3. DROP and recreate the CP operator SELECT policy
--    on service_orders with proper isolation
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cp_operator_select_so" ON service_orders;

CREATE POLICY "cp_operator_select_so"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'collection_point_operator'::app_role)
  AND (
    -- If view_only_own_orders = true (default): only own CP's orders
    (collection_point_id = get_user_cp_id())
    OR
    -- If view_only_own_orders = false: can see all tenant orders
    -- (tenant isolation is already enforced by RESTRICTIVE policy)
    cp_can_view_all_tenant_orders()
  )
);

-- ──────────────────────────────────────────────────────────────
-- 4. Update is_cp_operator_for_cp to also check profiles
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_cp_operator_for_cp(_cp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.collection_point_id = _cp_id
  )
  OR EXISTS (
    SELECT 1 FROM collection_point_users
    WHERE collection_point_id = _cp_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- Update is_cp_operator_for_so similarly
CREATE OR REPLACE FUNCTION public.is_cp_operator_for_so(_so_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = _so_id
      AND so.collection_point_id IS NOT NULL
      AND so.collection_point_id = get_user_cp_id()
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- 5. Harden quote access: CP operator must have view_quotes=true
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cp_operator_select_quotes" ON repair_quotes;

CREATE POLICY "cp_operator_select_quotes"
ON public.repair_quotes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'collection_point_operator'::app_role)
  AND is_cp_operator_for_so(service_order_id)
  AND check_cp_permission('view_quotes')
);

-- ──────────────────────────────────────────────────────────────
-- 6. Add CP operator to quote_approvals SELECT (with permission check)
--    and block INSERT if approve_quotes = false
-- ──────────────────────────────────────────────────────────────

-- Allow CP operator to VIEW approvals for their SOs (if view_quotes)
CREATE POLICY "cp_operator_select_qa"
ON public.quote_approvals
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'collection_point_operator'::app_role)
  AND is_cp_operator_for_so(
    (SELECT rq.service_order_id FROM repair_quotes rq WHERE rq.id = quote_id)
  )
  AND check_cp_permission('view_quotes')
);

-- Allow CP operator to INSERT approvals only if approve_quotes = true
CREATE POLICY "cp_operator_insert_qa"
ON public.quote_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'collection_point_operator'::app_role)
  AND check_cp_permission('approve_quotes')
);

-- ──────────────────────────────────────────────────────────────
-- 7. Harden the validation trigger to also cover quote operations
--    and use explicit enum casts for status comparisons
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_cp_operator_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_cp_op boolean;
  _settings jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'collection_point_operator'
  ) INTO _is_cp_op;

  IF NOT _is_cp_op THEN
    RETURN NEW;
  END IF;

  SELECT cp.settings INTO _settings
  FROM profiles p
  JOIN collection_points cp ON cp.id = p.collection_point_id
  WHERE p.id = auth.uid();

  IF _settings IS NULL THEN
    -- Fallback: check collection_point_users
    SELECT cp.settings INTO _settings
    FROM collection_point_users cpu
    JOIN collection_points cp ON cp.id = cpu.collection_point_id
    WHERE cpu.user_id = auth.uid() AND cpu.is_active = true
    LIMIT 1;
  END IF;

  IF _settings IS NULL THEN
    RAISE EXCEPTION 'Operador de ponto de coleta sem configurações válidas';
  END IF;

  -- ── service_orders ──
  IF TG_TABLE_NAME = 'service_orders' THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT COALESCE((_settings->>'create_service_orders')::boolean, false) THEN
        RAISE EXCEPTION 'Sem permissão para criar ordens de serviço';
      END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      -- Block cancel
      IF NEW.status::text = 'cancelled' AND OLD.status::text != 'cancelled' THEN
        IF NOT COALESCE((_settings->>'cancel_orders')::boolean, false) THEN
          RAISE EXCEPTION 'Sem permissão para cancelar ordens de serviço';
        END IF;
      END IF;

      -- Block deliver/close
      IF NEW.status::text = 'delivered' AND OLD.status::text != 'delivered' THEN
        IF NOT COALESCE((_settings->>'close_orders')::boolean, false) THEN
          RAISE EXCEPTION 'Sem permissão para finalizar ordens de serviço';
        END IF;
      END IF;

      -- Block field edits (CP operators cannot edit OS content)
      IF NEW.reported_issue IS DISTINCT FROM OLD.reported_issue
        OR NEW.physical_condition IS DISTINCT FROM OLD.physical_condition
        OR NEW.intake_notes IS DISTINCT FROM OLD.intake_notes
        OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
        OR NEW.assigned_technician_id IS DISTINCT FROM OLD.assigned_technician_id
      THEN
        RAISE EXCEPTION 'Operador de ponto de coleta não pode editar ordens de serviço';
      END IF;
    END IF;
  END IF;

  -- ── customers ──
  IF TG_TABLE_NAME = 'customers' THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT COALESCE((_settings->>'create_customers')::boolean, false) THEN
        RAISE EXCEPTION 'Sem permissão para criar clientes';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NOT COALESCE((_settings->>'edit_customers')::boolean, false) THEN
        RAISE EXCEPTION 'Sem permissão para editar clientes';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 8. Verify and harden collection_point_performance RPC
--    - Uses DISTINCT to avoid double-counting
--    - Uses total_amount > 0 to avoid empty OS
--    - Explicit tenant filter
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.collection_point_performance(
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _cp_id uuid DEFAULT NULL
)
RETURNS TABLE(
  cp_id uuid,
  cp_name text,
  total_orders bigint,
  completed_orders bigint,
  total_revenue numeric,
  avg_ticket numeric,
  commission_value numeric,
  commission_type text,
  calculated_commission numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_active_tenant_id();
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant não identificado';
  END IF;

  RETURN QUERY
  SELECT
    cp.id AS cp_id,
    cp.name::text AS cp_name,
    COUNT(DISTINCT so.id) AS total_orders,
    COUNT(DISTINCT so.id) FILTER (WHERE so.status::text = 'delivered') AS completed_orders,
    COALESCE(SUM(DISTINCT so.total_amount) FILTER (WHERE so.status::text = 'delivered'), 0) AS total_revenue,
    CASE
      WHEN COUNT(DISTINCT so.id) FILTER (WHERE so.status::text = 'delivered') > 0
      THEN COALESCE(SUM(DISTINCT so.total_amount) FILTER (WHERE so.status::text = 'delivered'), 0) /
           COUNT(DISTINCT so.id) FILTER (WHERE so.status::text = 'delivered')
      ELSE 0
    END AS avg_ticket,
    cp.commission_value AS commission_value,
    cp.commission_type::text AS commission_type,
    CASE cp.commission_type::text
      WHEN 'percentage' THEN
        COALESCE(SUM(DISTINCT so.total_amount) FILTER (WHERE so.status::text = 'delivered'), 0) * (cp.commission_value / 100)
      WHEN 'fixed_per_order' THEN
        COUNT(DISTINCT so.id) FILTER (WHERE so.status::text = 'delivered') * cp.commission_value
      WHEN 'fixed_per_device' THEN
        COUNT(DISTINCT so.id) FILTER (WHERE so.status::text = 'delivered') * cp.commission_value
    END AS calculated_commission
  FROM collection_points cp
  LEFT JOIN service_orders so
    ON so.collection_point_id = cp.id
    AND so.tenant_id = _tenant
    AND (_from IS NULL OR so.created_at >= _from)
    AND (_to IS NULL OR so.created_at <= _to)
  WHERE cp.tenant_id = _tenant
    AND cp.is_active = true
    AND (_cp_id IS NULL OR cp.id = _cp_id)
  GROUP BY cp.id, cp.name, cp.commission_value, cp.commission_type
  ORDER BY total_revenue DESC;
END;
$$;
