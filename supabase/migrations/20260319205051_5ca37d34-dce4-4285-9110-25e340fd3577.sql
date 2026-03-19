
-- 1. Add settings jsonb to collection_points
ALTER TABLE public.collection_points
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{
    "create_customers": true,
    "edit_customers": false,
    "create_service_orders": true,
    "view_only_own_orders": true,
    "view_quotes": true,
    "approve_quotes": false,
    "upload_attachments": true,
    "view_status": true,
    "view_financial": false,
    "close_orders": false,
    "cancel_orders": false
  }'::jsonb;

-- 2. Add collection_point_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS collection_point_id uuid REFERENCES public.collection_points(id) ON DELETE SET NULL;

-- 3. Trigger: auto-set collection_point_id on service_orders
CREATE OR REPLACE FUNCTION public.auto_set_collection_point_on_so()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cp_id uuid;
BEGIN
  IF NEW.collection_point_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT p.collection_point_id INTO _cp_id
  FROM profiles p
  WHERE p.id = auth.uid()
    AND p.collection_point_id IS NOT NULL;
  IF _cp_id IS NOT NULL THEN
    NEW.collection_point_id := _cp_id;
    IF NEW.intake_channel IS NULL OR NEW.intake_channel = 'front_desk' THEN
      NEW.intake_channel := 'collection_point';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_cp_on_so ON service_orders;
CREATE TRIGGER trg_auto_set_cp_on_so
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_collection_point_on_so();

-- 4. Helper: get CP settings for current user
CREATE OR REPLACE FUNCTION public.get_my_cp_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(cp.settings, '{}'::jsonb)
  FROM profiles p
  JOIN collection_points cp ON cp.id = p.collection_point_id
  WHERE p.id = auth.uid()
    AND cp.is_active = true;
$$;

-- 5. Helper: check a single CP permission
CREATE OR REPLACE FUNCTION public.check_cp_permission(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (cp.settings ->> _permission)::boolean
     FROM profiles p
     JOIN collection_points cp ON cp.id = p.collection_point_id
     WHERE p.id = auth.uid()
       AND cp.is_active = true),
    false
  );
$$;

-- 6. RLS: cp_operator can only see own CP orders
CREATE POLICY "cp_operator_view_own_orders"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'collection_point_operator'
    )
    AND collection_point_id = (
      SELECT p.collection_point_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
  OR NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'collection_point_operator'
  )
);

-- 7. Validation trigger: block CP operator actions based on settings
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
    RAISE EXCEPTION 'Operador de ponto de coleta sem configurações válidas';
  END IF;

  IF TG_TABLE_NAME = 'service_orders' THEN
    IF TG_OP = 'INSERT' THEN
      IF NOT COALESCE((_settings->>'create_service_orders')::boolean, false) THEN
        RAISE EXCEPTION 'Sem permissão para criar ordens de serviço';
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        IF NOT COALESCE((_settings->>'cancel_orders')::boolean, false) THEN
          RAISE EXCEPTION 'Sem permissão para cancelar ordens de serviço';
        END IF;
      END IF;
      IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        IF NOT COALESCE((_settings->>'close_orders')::boolean, false) THEN
          RAISE EXCEPTION 'Sem permissão para finalizar ordens de serviço';
        END IF;
      END IF;
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

DROP TRIGGER IF EXISTS trg_validate_cp_so ON service_orders;
CREATE TRIGGER trg_validate_cp_so
  BEFORE INSERT OR UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_cp_operator_permissions();

DROP TRIGGER IF EXISTS trg_validate_cp_customers ON customers;
CREATE TRIGGER trg_validate_cp_customers
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_cp_operator_permissions();

-- 8. RPC: Partner performance report with filters
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
  RETURN QUERY
  SELECT
    cp.id AS cp_id,
    cp.name::text AS cp_name,
    COUNT(so.id) AS total_orders,
    COUNT(so.id) FILTER (WHERE so.status = 'delivered') AS completed_orders,
    COALESCE(SUM(so.total_amount) FILTER (WHERE so.status = 'delivered'), 0) AS total_revenue,
    CASE
      WHEN COUNT(so.id) FILTER (WHERE so.status = 'delivered') > 0
      THEN COALESCE(SUM(so.total_amount) FILTER (WHERE so.status = 'delivered'), 0) /
           COUNT(so.id) FILTER (WHERE so.status = 'delivered')
      ELSE 0
    END AS avg_ticket,
    cp.commission_value AS commission_value,
    cp.commission_type::text AS commission_type,
    CASE cp.commission_type
      WHEN 'percentage' THEN
        COALESCE(SUM(so.total_amount) FILTER (WHERE so.status = 'delivered'), 0) * (cp.commission_value / 100)
      WHEN 'fixed_per_order' THEN
        COUNT(so.id) FILTER (WHERE so.status = 'delivered') * cp.commission_value
      WHEN 'fixed_per_device' THEN
        COUNT(so.id) FILTER (WHERE so.status = 'delivered') * cp.commission_value
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
