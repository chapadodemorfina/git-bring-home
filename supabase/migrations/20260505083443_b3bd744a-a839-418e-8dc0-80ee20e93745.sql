CREATE OR REPLACE FUNCTION public.quote_revise(p_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE;
  v_existing uuid; v_new_id uuid; v_from text;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  SELECT id INTO v_existing
    FROM public.quotes
   WHERE parent_quote_id = v_q.id AND status = 'draft' AND tenant_id = v_tenant
   ORDER BY created_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'original_quote_id', v_q.id,
                              'new_quote_id', v_existing, 'new_status', 'draft',
                              'version', v_q.version + 1, 'idempotent', true);
  END IF;

  IF v_q.status NOT IN ('rejected','expired','cancelled') THEN
    RAISE EXCEPTION 'invalid_state: cannot revise quote in %', v_q.status;
  END IF;

  v_from := v_q.status;

  BEGIN
    INSERT INTO public.quotes(
      tenant_id, customer_id, device_id, service_order_id,
      title, description, valid_until, discount_amount,
      parent_quote_id, version, status, created_by, updated_by
    ) VALUES (
      v_q.tenant_id, v_q.customer_id, v_q.device_id, v_q.service_order_id,
      v_q.title, v_q.description, v_q.valid_until, v_q.discount_amount,
      v_q.id, COALESCE(v_q.version,1) + 1, 'draft', v_uid, v_uid
    ) RETURNING id INTO v_new_id;
  EXCEPTION WHEN unique_violation THEN
    -- Outra transação concorrente já criou o draft revisado. Retorna o existente.
    SELECT id INTO v_existing
      FROM public.quotes
     WHERE parent_quote_id = v_q.id AND status = 'draft' AND tenant_id = v_tenant
     ORDER BY created_at DESC LIMIT 1;
    IF v_existing IS NULL THEN RAISE; END IF;
    RETURN jsonb_build_object('ok', true, 'original_quote_id', v_q.id,
                              'new_quote_id', v_existing, 'new_status', 'draft',
                              'version', COALESCE(v_q.version,1) + 1, 'idempotent', true);
  END;

  INSERT INTO public.quote_items(
    tenant_id, quote_id, item_type, product_id, description,
    quantity, unit_cost, unit_price
  )
  SELECT v_q.tenant_id, v_new_id, item_type, product_id, description,
         quantity, unit_cost, unit_price
    FROM public.quote_items WHERE quote_id = v_q.id;

  PERFORM public.recalculate_quote_totals(v_new_id);

  UPDATE public.quotes SET status='revised', updated_by=v_uid WHERE id = v_q.id;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'revised', v_from, 'revised',
    jsonb_build_object('new_quote_id', v_new_id));
  PERFORM public._quote_log_event(v_new_id, v_tenant, v_uid, 'revision_created', NULL, 'draft',
    jsonb_build_object('parent_quote_id', v_q.id, 'version', COALESCE(v_q.version,1) + 1));

  RETURN jsonb_build_object('ok', true, 'original_quote_id', v_q.id,
                            'new_quote_id', v_new_id, 'new_status', 'draft',
                            'version', COALESCE(v_q.version,1) + 1);
END;
$function$