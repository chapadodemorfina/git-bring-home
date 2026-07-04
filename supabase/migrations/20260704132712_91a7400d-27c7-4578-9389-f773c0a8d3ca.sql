
-- ============================================================
-- FASE 2A.5d-3c — Blindar comissões de venda/OS e reversão
-- ============================================================

-- ------------------------------------------------------------
-- 1) Função interna: _generate_sale_commissions_internal
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._generate_sale_commissions_internal(_sale_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sale RECORD;
  _rule RECORD;
  _base NUMERIC;
  _amount NUMERIC;
  _count INTEGER := 0;
  _target_user UUID;
  _has_matching_items BOOLEAN;
  _item_total NUMERIC;
BEGIN
  SELECT * INTO _sale FROM sales WHERE id = _sale_id;
  IF NOT FOUND OR _sale.status <> 'completed' THEN RETURN 0; END IF;

  FOR _rule IN
    SELECT * FROM commission_rules
    WHERE source_type = 'sale' AND is_active = true AND tenant_id = _sale.tenant_id
  LOOP
    IF _rule.only_after_payment AND _sale.payment_status <> 'paid' THEN CONTINUE; END IF;

    IF _rule.role IN ('front_desk', 'manager', 'admin') THEN
      _target_user := _sale.seller_user_id;
    ELSE
      CONTINUE;
    END IF;
    IF _target_user IS NULL THEN CONTINUE; END IF;

    IF _rule.product_id IS NOT NULL THEN
      SELECT COALESCE(SUM(si.total_amount), 0) INTO _item_total
      FROM sale_items si WHERE si.sale_id = _sale_id AND si.product_id = _rule.product_id;
      IF _item_total <= 0 THEN CONTINUE; END IF;
    END IF;

    IF _rule.category_filter IS NOT NULL AND _rule.category_filter <> '' THEN
      SELECT EXISTS(
        SELECT 1 FROM sale_items si
        JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = _sale_id AND p.category = _rule.category_filter
      ) INTO _has_matching_items;
      IF NOT _has_matching_items THEN CONTINUE; END IF;
    END IF;

    IF _rule.product_id IS NOT NULL THEN
      _base := _item_total;
    ELSIF _rule.category_filter IS NOT NULL AND _rule.category_filter <> '' THEN
      SELECT COALESCE(SUM(si.total_amount), 0) INTO _base
      FROM sale_items si JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = _sale_id AND p.category = _rule.category_filter;
    ELSIF _rule.base_type = 'total_amount' THEN
      _base := _sale.total_amount;
    ELSIF _rule.base_type = 'net_amount' THEN
      _base := _sale.total_amount - COALESCE(_sale.discount_amount, 0);
    ELSIF _rule.base_type = 'profit' THEN
      SELECT _sale.total_amount - COALESCE(SUM(si.cost_price_snapshot * si.quantity), 0)
      INTO _base FROM sale_items si WHERE si.sale_id = _sale_id;
    ELSIF _rule.base_type = 'received_amount' THEN
      SELECT COALESCE(SUM(sp.amount), 0) INTO _base
      FROM sale_payments sp WHERE sp.sale_id = _sale_id;
    ELSIF _rule.base_type = 'fixed_per_unit' THEN
      _base := 1;
    ELSE
      _base := _sale.total_amount;
    END IF;

    IF COALESCE(_rule.fixed_amount, 0) > 0 THEN
      _amount := _rule.fixed_amount;
    ELSE
      _amount := _base * (COALESCE(_rule.percentage, 0) / 100);
    END IF;

    IF _amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO commission_entries (tenant_id, user_id, rule_id, role, source_type, source_id, source_label, base_amount, commission_amount, reference_date, status)
    VALUES (_sale.tenant_id, _target_user, _rule.id, _rule.role, 'sale', _sale_id, _sale.sale_number, _base, _amount, COALESCE(_sale.completed_at::date, CURRENT_DATE), 'pending')
    ON CONFLICT (user_id, source_id, rule_id) DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$function$;

REVOKE ALL ON FUNCTION public._generate_sale_commissions_internal(uuid) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 2) Wrapper público: generate_sale_commissions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_sale_commissions(_sale_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tid uuid := get_active_tenant_id();
  _sale_tid uuid;
BEGIN
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not set' USING ERRCODE = 'P0001';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT has_any_role(
    auth.uid(),
    ARRAY['admin','manager','front_desk']::app_role[]
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT tenant_id INTO _sale_tid FROM sales WHERE id = _sale_id;
  IF _sale_tid IS NULL THEN
    RAISE EXCEPTION 'sale_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF _sale_tid <> _tid THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN public._generate_sale_commissions_internal(_sale_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_sale_commissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_sale_commissions(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 3) complete_sale — trocar chamada para função interna
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_sale(_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sale sales%ROWTYPE;
  _item record;
  _product products%ROWTYPE;
  _new_qty integer;
  _user_id uuid;
  _total_paid numeric;
  _pay_status sale_payment_status;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _sale FROM sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF _sale.status <> 'draft' THEN RAISE EXCEPTION 'Venda não está em rascunho'; END IF;

  FOR _item IN SELECT * FROM sale_items WHERE sale_id = _sale_id LOOP
    IF _item.product_id IS NOT NULL THEN
      SELECT * INTO _product FROM products WHERE id = _item.product_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Produto % não encontrado', _item.product_name_snapshot; END IF;
      IF _product.quantity < _item.quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para %: disponível %, solicitado %', _product.name, _product.quantity, _item.quantity;
      END IF;

      _new_qty := _product.quantity - _item.quantity;
      UPDATE products SET quantity = _new_qty WHERE id = _item.product_id;

      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, created_by, tenant_id)
      VALUES (_item.product_id, 'sale', -_item.quantity, _product.quantity, _new_qty, _item.cost_price_snapshot, 'sale', _sale_id, 'Venda ' || _sale.sale_number, _user_id, _sale.tenant_id);
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM sale_payments WHERE sale_id = _sale_id;
  IF _total_paid >= _sale.total_amount THEN _pay_status := 'paid';
  ELSIF _total_paid > 0 THEN _pay_status := 'partial';
  ELSE _pay_status := 'pending';
  END IF;

  PERFORM set_config('app.syncing_sale', 'true', true);

  UPDATE sales SET status = 'completed', payment_status = _pay_status, completed_at = now() WHERE id = _sale_id;

  IF _sale.total_amount > 0 THEN
    INSERT INTO financial_entries (entry_type, description, amount, paid_amount, customer_id, category, status, created_by, tenant_id, sale_id)
    VALUES ('revenue', 'Venda ' || _sale.sale_number, _sale.total_amount, _total_paid,
      _sale.customer_id, 'sale',
      CASE WHEN _total_paid >= _sale.total_amount THEN 'paid'::financial_entry_status
           WHEN _total_paid > 0 THEN 'partial'::financial_entry_status
           ELSE 'pending'::financial_entry_status END,
      _user_id, _sale.tenant_id, _sale_id);
  END IF;

  PERFORM set_config('app.syncing_sale', 'false', true);

  -- Auto-generate commissions via internal function (bypasses caller role/tenant checks)
  PERFORM public._generate_sale_commissions_internal(_sale_id);

  RETURN jsonb_build_object('success', true, 'payment_status', _pay_status::text);
END;
$function$;

-- ------------------------------------------------------------
-- 4) generate_so_commissions — tenant-safety + revogar grants
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_so_commissions(_so_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _so RECORD;
  _quote RECORD;
  _rule RECORD;
  _base NUMERIC;
  _amount NUMERIC;
  _target_user UUID;
  _count INTEGER := 0;
BEGIN
  SELECT * INTO _so FROM service_orders WHERE id = _so_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT * INTO _quote FROM repair_quotes
    WHERE service_order_id = _so_id AND status = 'approved'
    ORDER BY updated_at DESC LIMIT 1;

  FOR _rule IN
    SELECT * FROM commission_rules
    WHERE source_type = 'service_order' AND is_active = true AND tenant_id = _so.tenant_id
  LOOP
    IF _rule.role IN ('bench_technician', 'field_technician') THEN
      _target_user := _so.assigned_technician_id;
    ELSIF _rule.role IN ('front_desk', 'manager', 'admin') THEN
      _target_user := _so.created_by;
    ELSE
      CONTINUE;
    END IF;

    IF _target_user IS NULL THEN CONTINUE; END IF;
    IF NOT has_role(_target_user, _rule.role::app_role) THEN CONTINUE; END IF;

    IF _rule.base_type = 'labor_cost' THEN
      _base := COALESCE(_quote.labor_cost, 0);
    ELSIF _rule.base_type = 'total_amount' THEN
      _base := COALESCE(_quote.total_amount, _so.estimated_cost, 0);
    ELSIF _rule.base_type = 'fixed_per_unit' THEN
      _base := 1;
    ELSE
      _base := COALESCE(_quote.total_amount, 0);
    END IF;

    IF _rule.fixed_amount > 0 THEN
      _amount := _rule.fixed_amount;
    ELSE
      _amount := _base * (_rule.percentage / 100);
    END IF;

    IF _amount <= 0 THEN CONTINUE; END IF;

    INSERT INTO commission_entries (tenant_id, user_id, rule_id, role, source_type, source_id, source_label, base_amount, commission_amount, reference_date)
    VALUES (_so.tenant_id, _target_user, _rule.id, _rule.role, 'service_order', _so_id, _so.order_number, _base, _amount, CURRENT_DATE)
    ON CONFLICT (user_id, source_id, rule_id) DO NOTHING;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_so_commissions(uuid) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 5) reverse_sale_commissions — tenant-safety no UPDATE + revogar grants
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_sale_commissions(_sale_id uuid, _proportion numeric DEFAULT 1.0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sale_tid uuid;
BEGIN
  SELECT tenant_id INTO _sale_tid FROM sales WHERE id = _sale_id;
  IF _sale_tid IS NULL THEN RETURN; END IF;

  IF _proportion >= 1.0 THEN
    UPDATE commission_entries SET status = 'cancelled', updated_at = now()
    WHERE source_id = _sale_id AND source_type = 'sale'
      AND tenant_id = _sale_tid
      AND status IN ('pending', 'approved');
  ELSE
    UPDATE commission_entries
    SET commission_amount = commission_amount * (1 - _proportion),
        base_amount = base_amount * (1 - _proportion),
        notes = COALESCE(notes, '') || ' [Estorno proporcional: ' || round(_proportion * 100) || '%]',
        updated_at = now()
    WHERE source_id = _sale_id AND source_type = 'sale'
      AND tenant_id = _sale_tid
      AND status IN ('pending', 'approved');
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.reverse_sale_commissions(uuid, numeric) FROM PUBLIC, anon, authenticated;
