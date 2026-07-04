
-- FASE 2A.5d-3a — Blindar mutações de comissão de ponto de coleta
-- Adiciona gate auth.uid() + has_any_role, FOR UPDATE em approve/pay, revoga anon/PUBLIC.

-- =========================================================
-- 1) generate_cp_commissions — admin, manager
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_cp_commissions(_period_start date, _period_end date, _cp_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid := get_active_tenant_id();
  _row RECORD;
  _count integer := 0;
  _commission numeric;
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  FOR _row IN
    WITH base_orders AS (
      SELECT DISTINCT ON (so.id)
        so.id AS so_id,
        so.collection_point_id
      FROM service_orders so
      WHERE so.tenant_id = _tenant
        AND so.collection_point_id IS NOT NULL
        AND so.status::text IN ('completed', 'delivered', 'delivered_to_customer')
        AND so.created_at::date >= _period_start
        AND so.created_at::date <= _period_end
        AND (_cp_id IS NULL OR so.collection_point_id = _cp_id)
    ),
    order_revenue AS (
      SELECT
        bo.so_id,
        bo.collection_point_id,
        COALESCE(SUM(fe.amount), 0) AS revenue
      FROM base_orders bo
      LEFT JOIN financial_entries fe
        ON fe.service_order_id = bo.so_id
        AND fe.entry_type = 'revenue'
        AND fe.status::text <> 'cancelled'
        AND fe.tenant_id = _tenant
      GROUP BY bo.so_id, bo.collection_point_id
    )
    SELECT
      cp.id AS cp_id,
      cp.name AS cp_name,
      cp.commission_type,
      cp.commission_value,
      COUNT(*) AS total_orders,
      COUNT(*) AS completed_orders,
      COALESCE(SUM(orv.revenue), 0) AS total_revenue
    FROM order_revenue orv
    JOIN collection_points cp ON cp.id = orv.collection_point_id AND cp.tenant_id = _tenant
    GROUP BY cp.id, cp.name, cp.commission_type, cp.commission_value
  LOOP
    IF EXISTS (
      SELECT 1 FROM cp_commission_periods
      WHERE tenant_id = _tenant
        AND collection_point_id = _row.cp_id
        AND period_start = _period_start
        AND period_end = _period_end
    ) THEN
      CONTINUE;
    END IF;

    IF _row.commission_type::text = 'percentage' THEN
      _commission := _row.total_revenue * (_row.commission_value / 100);
    ELSIF _row.commission_type::text = 'fixed_per_order' THEN
      _commission := _row.completed_orders * _row.commission_value;
    ELSIF _row.commission_type::text = 'fixed_per_device' THEN
      _commission := _row.completed_orders * _row.commission_value;
    ELSE
      _commission := 0;
    END IF;

    INSERT INTO cp_commission_periods (
      tenant_id, collection_point_id, period_start, period_end,
      total_orders, completed_orders, total_revenue, commission_amount, status
    ) VALUES (
      _tenant, _row.cp_id, _period_start, _period_end,
      _row.total_orders, _row.completed_orders, _row.total_revenue, _commission, 'pending'
    );
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_cp_commissions(date, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_cp_commissions(date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_cp_commissions(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_cp_commissions(date, date, uuid) TO service_role;

-- =========================================================
-- 2) approve_cp_commission — admin, manager
-- =========================================================
CREATE OR REPLACE FUNCTION public.approve_cp_commission(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _tenant uuid := get_active_tenant_id();
  _cp_name text;
  _fe_id uuid;
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- Lock row to prevent concurrent double-approval
  SELECT * INTO _rec
  FROM cp_commission_periods
  WHERE id = _id AND tenant_id = _tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comissão não encontrada';
  END IF;

  IF _rec.status != 'pending' THEN
    RAISE EXCEPTION 'Apenas comissões pendentes podem ser aprovadas (status atual: %)', _rec.status;
  END IF;

  SELECT name INTO _cp_name FROM collection_points WHERE id = _rec.collection_point_id AND tenant_id = _tenant;

  INSERT INTO financial_entries (
    tenant_id, entry_type, description, amount, paid_amount, status, category, collection_point_id, created_by
  ) VALUES (
    _tenant, 'expense', 'Comissão ponto: ' || COALESCE(_cp_name, 'N/A') || ' (' || _rec.period_start || ' a ' || _rec.period_end || ')',
    _rec.commission_amount, 0, 'pending', 'Comissão Ponto de Coleta', _rec.collection_point_id, auth.uid()
  ) RETURNING id INTO _fe_id;

  UPDATE cp_commission_periods
  SET status = 'approved', financial_entry_id = _fe_id, updated_at = now()
  WHERE id = _id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.approve_cp_commission(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_cp_commission(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_cp_commission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cp_commission(uuid) TO service_role;

-- =========================================================
-- 3) pay_cp_commission — admin, manager, finance
-- =========================================================
CREATE OR REPLACE FUNCTION public.pay_cp_commission(_id uuid, _method text DEFAULT 'pix'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _tenant uuid := get_active_tenant_id();
  _register_id uuid;
  _affects_cash boolean;
  _affects_bank boolean;
BEGIN
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[]) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- Lock row to prevent concurrent double-payment
  SELECT * INTO _rec
  FROM cp_commission_periods
  WHERE id = _id AND tenant_id = _tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comissão não encontrada';
  END IF;

  IF _rec.status = 'pending' THEN
    RAISE EXCEPTION 'Comissão precisa ser aprovada antes de pagar';
  END IF;

  IF _rec.status = 'paid' THEN
    RAISE EXCEPTION 'Comissão já foi paga';
  END IF;

  IF _rec.financial_entry_id IS NOT NULL THEN
    UPDATE financial_entries
    SET paid_amount = amount, status = 'paid', updated_at = now()
    WHERE id = _rec.financial_entry_id AND tenant_id = _tenant;
  END IF;

  _affects_cash := _method IN ('cash', 'dinheiro');
  _affects_bank := NOT _affects_cash;

  SELECT id INTO _register_id
  FROM cash_registers
  WHERE tenant_id = _tenant AND status = 'open'
  LIMIT 1;

  IF _register_id IS NOT NULL THEN
    INSERT INTO cash_register_movements (
      tenant_id, cash_register_id, movement_type, amount, description,
      payment_method, source_type, reference_id, affects_cash, affects_bank
    ) VALUES (
      _tenant, _register_id, 'withdrawal', _rec.commission_amount,
      'Pagamento comissão ponto de coleta',
      _method, 'cp_commission', _id::text, _affects_cash, _affects_bank
    );
  END IF;

  UPDATE cp_commission_periods
  SET status = 'paid', updated_at = now()
  WHERE id = _id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.pay_cp_commission(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pay_cp_commission(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_cp_commission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_cp_commission(uuid, text) TO service_role;
