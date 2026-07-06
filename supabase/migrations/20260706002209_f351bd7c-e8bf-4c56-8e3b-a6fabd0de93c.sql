
-- Fase 3.5.12.5-c.1 — RPC transacional create_sale
-- Cria a função sem migrar hooks/UI. Complete_sale é chamada internamente quando _finalize=true.

CREATE OR REPLACE FUNCTION public.create_sale(
  _sale_data jsonb,
  _items jsonb,
  _payments jsonb DEFAULT '[]'::jsonb,
  _finalize boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid;
  _tenant uuid;
  _sale_id uuid;
  _customer_id uuid;
  _seller_user_id uuid;
  _notes text;
  _discount numeric;
  _surcharge numeric;
  _subtotal numeric := 0;
  _total numeric;
  _item_total numeric;
  _payments_total numeric := 0;
  _items_count integer;
  _payments_count integer;
  _pay_status public.sale_payment_status;
  _it jsonb;
  _pay jsonb;
  _product_id uuid;
  _qty integer;
  _unit_price numeric;
  _item_discount numeric;
  _cost_price numeric;
  _sku text;
  _pname text;
  _prod_tenant uuid;
  _prod_name text;
  _pay_method public.sale_payment_method;
  _pay_amount numeric;
  _pay_installments integer;
  _pay_reference text;
BEGIN
  -- Auth
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Tenant
  _tenant := public.get_active_tenant_id();
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'tenant required' USING ERRCODE = '42501';
  END IF;

  -- Permissão
  IF NOT public.has_permission(_uid, 'sales.create') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- _sale_data
  IF _sale_data IS NULL OR jsonb_typeof(_sale_data) <> 'object' THEN
    RAISE EXCEPTION 'invalid sale_data' USING ERRCODE = '22023';
  END IF;

  _customer_id     := NULLIF(_sale_data->>'customer_id','')::uuid;
  _seller_user_id  := NULLIF(_sale_data->>'seller_user_id','')::uuid;
  _notes           := NULLIF(_sale_data->>'notes','');
  _discount        := COALESCE((_sale_data->>'discount_amount')::numeric, 0);
  _surcharge       := COALESCE((_sale_data->>'surcharge_amount')::numeric, 0);

  IF _seller_user_id IS NULL THEN
    _seller_user_id := _uid;
  END IF;
  IF _discount < 0 OR _surcharge < 0 THEN
    RAISE EXCEPTION 'discount/surcharge must be >= 0' USING ERRCODE = '22023';
  END IF;

  -- Itens
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be an array' USING ERRCODE = '22023';
  END IF;
  _items_count := jsonb_array_length(_items);
  IF _items_count < 1 THEN
    RAISE EXCEPTION 'at least one item required' USING ERRCODE = '22023';
  END IF;

  -- Pagamentos (validação estrutural)
  IF _payments IS NULL THEN
    _payments := '[]'::jsonb;
  END IF;
  IF jsonb_typeof(_payments) <> 'array' THEN
    RAISE EXCEPTION 'payments must be an array' USING ERRCODE = '22023';
  END IF;
  _payments_count := jsonb_array_length(_payments);

  -- Recalcular subtotal server-side e validar itens/produto/tenant
  FOR _it IN SELECT jsonb_array_elements(_items) LOOP
    _product_id   := NULLIF(_it->>'product_id','')::uuid;
    _qty          := COALESCE((_it->>'quantity')::integer, 0);
    _unit_price   := COALESCE((_it->>'unit_price')::numeric, 0);
    _item_discount:= COALESCE((_it->>'discount_amount')::numeric, 0);

    IF _product_id IS NULL THEN
      RAISE EXCEPTION 'product_id required on item' USING ERRCODE = '22023';
    END IF;
    IF _qty <= 0 THEN
      RAISE EXCEPTION 'quantity must be > 0' USING ERRCODE = '22023';
    END IF;
    IF _unit_price < 0 OR _item_discount < 0 THEN
      RAISE EXCEPTION 'unit_price/discount must be >= 0' USING ERRCODE = '22023';
    END IF;

    SELECT tenant_id INTO _prod_tenant FROM public.products WHERE id = _product_id;
    IF _prod_tenant IS NULL THEN
      RAISE EXCEPTION 'product % not found', _product_id USING ERRCODE = '22023';
    END IF;
    IF _prod_tenant <> _tenant THEN
      RAISE EXCEPTION 'product does not belong to active tenant' USING ERRCODE = '42501';
    END IF;

    _item_total := (_unit_price * _qty) - _item_discount;
    IF _item_total < 0 THEN
      RAISE EXCEPTION 'item total cannot be negative' USING ERRCODE = '22023';
    END IF;
    _subtotal := _subtotal + _item_total;
  END LOOP;

  _total := _subtotal - _discount + _surcharge;
  IF _total < 0 THEN
    RAISE EXCEPTION 'total cannot be negative' USING ERRCODE = '22023';
  END IF;

  -- Validar pagamentos e somatório
  FOR _pay IN SELECT jsonb_array_elements(_payments) LOOP
    _pay_amount := COALESCE((_pay->>'amount')::numeric, 0);
    IF _pay_amount <= 0 THEN
      RAISE EXCEPTION 'payment amount must be > 0' USING ERRCODE = '22023';
    END IF;
    IF NULLIF(_pay->>'payment_method','') IS NULL THEN
      RAISE EXCEPTION 'payment_method required' USING ERRCODE = '22023';
    END IF;
    BEGIN
      _pay_method := (_pay->>'payment_method')::public.sale_payment_method;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid payment_method' USING ERRCODE = '22023';
    END;
    _payments_total := _payments_total + _pay_amount;
  END LOOP;

  IF _payments_total > _total + 0.005 THEN
    RAISE EXCEPTION 'payments total exceeds sale total' USING ERRCODE = '22023';
  END IF;

  -- payment_status inicial
  IF _payments_total <= 0 THEN
    _pay_status := 'pending';
  ELSIF _payments_total + 0.005 < _total THEN
    _pay_status := 'partial';
  ELSE
    _pay_status := 'paid';
  END IF;

  -- Insert sales (sale_number preenchido por trigger existente)
  INSERT INTO public.sales(
    sale_number, tenant_id, customer_id, seller_user_id,
    status, subtotal, discount_amount, surcharge_amount,
    total_amount, payment_status, notes
  )
  VALUES (
    '', _tenant, _customer_id, _seller_user_id,
    'draft', _subtotal, _discount, _surcharge,
    _total, _pay_status, _notes
  )
  RETURNING id INTO _sale_id;

  -- Insert sale_items em lote
  INSERT INTO public.sale_items(
    sale_id, tenant_id, product_id, sku_snapshot, product_name_snapshot,
    quantity, unit_price, cost_price_snapshot, discount_amount, total_amount
  )
  SELECT
    _sale_id,
    _tenant,
    NULLIF(x->>'product_id','')::uuid,
    NULLIF(x->>'sku_snapshot',''),
    COALESCE(NULLIF(x->>'product_name_snapshot',''), ''),
    COALESCE((x->>'quantity')::integer, 1),
    COALESCE((x->>'unit_price')::numeric, 0),
    COALESCE((x->>'cost_price_snapshot')::numeric, 0),
    COALESCE((x->>'discount_amount')::numeric, 0),
    (COALESCE((x->>'unit_price')::numeric,0) * COALESCE((x->>'quantity')::integer,1))
      - COALESCE((x->>'discount_amount')::numeric,0)
  FROM jsonb_array_elements(_items) AS x;

  -- Insert sale_payments em lote (se houver)
  IF _payments_count > 0 THEN
    INSERT INTO public.sale_payments(
      sale_id, tenant_id, payment_method, amount, installments, reference
    )
    SELECT
      _sale_id,
      _tenant,
      (x->>'payment_method')::public.sale_payment_method,
      (x->>'amount')::numeric,
      NULLIF(x->>'installments','')::integer,
      NULLIF(x->>'reference','')
    FROM jsonb_array_elements(_payments) AS x;
  END IF;

  -- Finalização opcional via complete_sale (rotina existente, SECURITY DEFINER)
  IF _finalize THEN
    PERFORM public.complete_sale(_sale_id);
  END IF;

  -- Auditoria
  INSERT INTO public.audit_logs(tenant_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    _tenant, _uid, 'sale_created', 'sales', _sale_id, NULL,
    jsonb_build_object(
      'subtotal', _subtotal,
      'discount_amount', _discount,
      'surcharge_amount', _surcharge,
      'total_amount', _total,
      'items_count', _items_count,
      'payments_count', _payments_count,
      'payment_total', _payments_total,
      'payment_status', _pay_status::text,
      'finalize', _finalize
    )
  );

  RETURN _sale_id;
END;
$function$;

-- Grants seguros
REVOKE ALL ON FUNCTION public.create_sale(jsonb,jsonb,jsonb,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_sale(jsonb,jsonb,jsonb,boolean) FROM anon;
REVOKE ALL ON FUNCTION public.create_sale(jsonb,jsonb,jsonb,boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_sale(jsonb,jsonb,jsonb,boolean) FROM service_role;

GRANT EXECUTE ON FUNCTION public.create_sale(jsonb,jsonb,jsonb,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale(jsonb,jsonb,jsonb,boolean) TO service_role;
