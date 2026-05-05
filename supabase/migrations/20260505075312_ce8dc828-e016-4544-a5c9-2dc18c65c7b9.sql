
-- ============================================================
-- FASE 2A: Campos auxiliares + RPCs transacionais de quotes
-- ============================================================

-- 1) Campos auxiliares (idempotente)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS approved_by uuid NULL,
  ADD COLUMN IF NOT EXISTS rejected_by uuid NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS converted_service_order_id uuid NULL,
  ADD COLUMN IF NOT EXISTS parent_quote_id uuid NULL,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by uuid NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotes_parent_quote_id_fkey'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_parent_quote_id_fkey
      FOREIGN KEY (parent_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Atualizar protect_locked_quote para reconhecer novos campos como permitidos
-- nas transições corretas (idempotency-safe re-creation)
CREATE OR REPLACE FUNCTION public.protect_locked_quote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _status_changed boolean;
  _is_approve_stamp boolean;
  _is_reject_stamp  boolean;
  _is_cancel_stamp  boolean;
  _is_convert_stamp boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved','converted','sent') THEN
      RAISE EXCEPTION 'quote_locked: cannot delete % quote', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'draft' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'converted' THEN
    RAISE EXCEPTION 'quote_locked: converted quote is immutable';
  END IF;

  _status_changed   := OLD.status IS DISTINCT FROM NEW.status;
  _is_approve_stamp := _status_changed AND NEW.status = 'approved';
  _is_reject_stamp  := _status_changed AND NEW.status = 'rejected';
  _is_cancel_stamp  := _status_changed AND NEW.status = 'cancelled';
  _is_convert_stamp := _status_changed AND NEW.status = 'converted';

  IF (OLD.tenant_id          IS DISTINCT FROM NEW.tenant_id)
  OR (OLD.customer_id        IS DISTINCT FROM NEW.customer_id)
  OR (OLD.device_id          IS DISTINCT FROM NEW.device_id)
  OR (OLD.service_order_id   IS DISTINCT FROM NEW.service_order_id)
  OR (OLD.quote_number       IS DISTINCT FROM NEW.quote_number)
  OR (OLD.title              IS DISTINCT FROM NEW.title)
  OR (OLD.description        IS DISTINCT FROM NEW.description)
  OR (OLD.subtotal_parts     IS DISTINCT FROM NEW.subtotal_parts)
  OR (OLD.subtotal_labor     IS DISTINCT FROM NEW.subtotal_labor)
  OR (OLD.subtotal_other     IS DISTINCT FROM NEW.subtotal_other)
  OR (OLD.discount_amount    IS DISTINCT FROM NEW.discount_amount)
  OR (OLD.total_amount       IS DISTINCT FROM NEW.total_amount)
  OR (OLD.total_cost         IS DISTINCT FROM NEW.total_cost)
  OR (OLD.estimated_profit   IS DISTINCT FROM NEW.estimated_profit)
  OR (OLD.valid_until        IS DISTINCT FROM NEW.valid_until)
  OR (OLD.created_by         IS DISTINCT FROM NEW.created_by)
  OR (OLD.created_at         IS DISTINCT FROM NEW.created_at)
  OR (OLD.parent_quote_id    IS DISTINCT FROM NEW.parent_quote_id)
  OR (OLD.version            IS DISTINCT FROM NEW.version)
  THEN
    RAISE EXCEPTION 'quote_material_fields_locked: only status/timestamps allowed when status=%', OLD.status;
  END IF;

  IF (OLD.approved_at IS DISTINCT FROM NEW.approved_at) AND NOT _is_approve_stamp THEN
    RAISE EXCEPTION 'quote_locked: approved_at only on transition to approved';
  END IF;
  IF (OLD.approved_by IS DISTINCT FROM NEW.approved_by) AND NOT _is_approve_stamp THEN
    RAISE EXCEPTION 'quote_locked: approved_by only on transition to approved';
  END IF;

  IF (OLD.rejected_at IS DISTINCT FROM NEW.rejected_at) AND NOT _is_reject_stamp THEN
    RAISE EXCEPTION 'quote_locked: rejected_at only on transition to rejected';
  END IF;
  IF (OLD.rejected_by IS DISTINCT FROM NEW.rejected_by) AND NOT _is_reject_stamp THEN
    RAISE EXCEPTION 'quote_locked: rejected_by only on transition to rejected';
  END IF;
  IF (OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason) AND NOT _is_reject_stamp THEN
    RAISE EXCEPTION 'quote_locked: rejection_reason only on transition to rejected';
  END IF;

  IF (OLD.cancelled_at IS DISTINCT FROM NEW.cancelled_at) AND NOT _is_cancel_stamp THEN
    RAISE EXCEPTION 'quote_locked: cancelled_at only on transition to cancelled';
  END IF;
  IF (OLD.cancelled_by IS DISTINCT FROM NEW.cancelled_by) AND NOT _is_cancel_stamp THEN
    RAISE EXCEPTION 'quote_locked: cancelled_by only on transition to cancelled';
  END IF;

  IF (OLD.converted_at IS DISTINCT FROM NEW.converted_at) AND NOT _is_convert_stamp THEN
    RAISE EXCEPTION 'quote_locked: converted_at only on transition to converted';
  END IF;
  IF (OLD.converted_service_order_id IS DISTINCT FROM NEW.converted_service_order_id) AND NOT _is_convert_stamp THEN
    RAISE EXCEPTION 'quote_locked: converted_service_order_id only on transition to converted';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_status_created ON public.quotes(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_customer_created ON public.quotes(tenant_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_parent_quote_id ON public.quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_so ON public.quotes(converted_service_order_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_so_status ON public.quotes(tenant_id, service_order_id, status);

-- 4) Helper: validar autorização e retornar (uid, tenant_id) ----
CREATE OR REPLACE FUNCTION public._quote_rpc_authorize()
 RETURNS TABLE(_uid uuid, _tenant uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant uuid := public.get_active_tenant_id();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission_denied: not authenticated';
  END IF;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'permission_denied: no active tenant';
  END IF;
  IF NOT public.has_any_role(v_uid, ARRAY[
    'admin','manager','front_desk','bench_technician','field_technician','finance'
  ]::app_role[]) THEN
    RAISE EXCEPTION 'permission_denied: insufficient role';
  END IF;
  _uid := v_uid;
  _tenant := v_tenant;
  RETURN NEXT;
END;
$function$;

-- 5) Helper: log estruturado em quote_history
CREATE OR REPLACE FUNCTION public._quote_log_event(
  _quote_id uuid, _tenant uuid, _actor uuid,
  _event text, _from text, _to text, _payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.quote_history(tenant_id, quote_id, action, notes, created_by)
  VALUES (
    _tenant, _quote_id, _event,
    (jsonb_build_object(
      'event', _event,
      'actor_id', _actor,
      'from_status', _from,
      'to_status', _to,
      'created_at', now()
    ) || _payload)::text,
    _actor
  );
END;
$function$;

-- ============================================================
-- 6) RPC: quote_send
-- ============================================================
CREATE OR REPLACE FUNCTION public.quote_send(p_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE; v_count int;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();

  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  IF v_q.status = 'sent' THEN
    -- idempotente
    RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', v_q.status,
                              'total_amount', v_q.total_amount, 'idempotent', true);
  END IF;
  IF v_q.status <> 'draft' THEN
    RAISE EXCEPTION 'invalid_state: quote is %', v_q.status;
  END IF;

  -- recalcular antes de validar
  PERFORM public.recalculate_quote_totals(v_q.id);
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;

  SELECT count(*) INTO v_count FROM public.quote_items WHERE quote_id = v_q.id;
  IF v_count = 0 THEN RAISE EXCEPTION 'validation_error: quote has no items'; END IF;
  IF COALESCE(v_q.total_amount,0) <= 0 THEN RAISE EXCEPTION 'validation_error: total_amount must be > 0'; END IF;
  IF v_q.valid_until IS NOT NULL AND v_q.valid_until < CURRENT_DATE THEN
    RAISE EXCEPTION 'validation_error: valid_until is past';
  END IF;

  UPDATE public.quotes SET status = 'sent', updated_by = v_uid WHERE id = v_q.id;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'sent', v_q.status, 'sent', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'sent',
                            'total_amount', v_q.total_amount);
END;
$function$;

-- ============================================================
-- 7) RPC: quote_approve
-- ============================================================
CREATE OR REPLACE FUNCTION public.quote_approve(
  p_quote_id uuid, p_approval_source text DEFAULT 'internal', p_note text DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();

  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  IF v_q.status = 'approved' THEN
    RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'approved',
                              'approved_at', v_q.approved_at, 'idempotent', true);
  END IF;
  IF v_q.status <> 'sent' THEN RAISE EXCEPTION 'invalid_state: quote is %', v_q.status; END IF;
  IF COALESCE(v_q.total_amount,0) <= 0 THEN RAISE EXCEPTION 'validation_error: total_amount must be > 0'; END IF;
  IF v_q.valid_until IS NOT NULL AND v_q.valid_until < CURRENT_DATE THEN
    RAISE EXCEPTION 'validation_error: quote is expired';
  END IF;

  UPDATE public.quotes
     SET status='approved', approved_at = COALESCE(approved_at, now()),
         approved_by = COALESCE(approved_by, v_uid), updated_by = v_uid
   WHERE id = v_q.id
   RETURNING * INTO v_q;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'approved', 'sent', 'approved',
    jsonb_build_object('approval_source', p_approval_source, 'note', p_note));

  RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'approved',
                            'approved_at', v_q.approved_at);
END;
$function$;

-- ============================================================
-- 8) RPC: quote_reject
-- ============================================================
CREATE OR REPLACE FUNCTION public.quote_reject(p_quote_id uuid, p_reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  IF v_q.status = 'rejected' THEN
    RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'rejected',
                              'rejected_at', v_q.rejected_at, 'idempotent', true);
  END IF;
  IF v_q.status <> 'sent' THEN RAISE EXCEPTION 'invalid_state: quote is %', v_q.status; END IF;

  UPDATE public.quotes
     SET status='rejected', rejected_at=COALESCE(rejected_at, now()),
         rejected_by = COALESCE(rejected_by, v_uid),
         rejection_reason = p_reason, updated_by = v_uid
   WHERE id = v_q.id RETURNING * INTO v_q;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'rejected', 'sent', 'rejected',
    jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'rejected',
                            'rejected_at', v_q.rejected_at);
END;
$function$;

-- ============================================================
-- 9) RPC: quote_cancel
-- ============================================================
CREATE OR REPLACE FUNCTION public.quote_cancel(p_quote_id uuid, p_reason text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE; v_from text;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  IF v_q.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'cancelled', 'idempotent', true);
  END IF;
  IF v_q.status NOT IN ('draft','sent') THEN
    RAISE EXCEPTION 'invalid_state: cannot cancel quote in %', v_q.status;
  END IF;

  v_from := v_q.status;
  UPDATE public.quotes
     SET status='cancelled', cancelled_at=now(), cancelled_by=v_uid, updated_by=v_uid
   WHERE id = v_q.id RETURNING * INTO v_q;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'cancelled', v_from, 'cancelled',
    jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'cancelled',
                            'cancelled_at', v_q.cancelled_at);
END;
$function$;

-- ============================================================
-- 10) RPC: quote_expire
-- ============================================================
CREATE OR REPLACE FUNCTION public.quote_expire(p_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  IF v_q.status = 'expired' THEN
    RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'expired', 'idempotent', true);
  END IF;
  IF v_q.status <> 'sent' THEN RAISE EXCEPTION 'invalid_state: quote is %', v_q.status; END IF;
  IF v_q.valid_until IS NULL OR v_q.valid_until >= CURRENT_DATE THEN
    RAISE EXCEPTION 'validation_error: quote not yet expired';
  END IF;

  UPDATE public.quotes SET status='expired', updated_by=v_uid WHERE id = v_q.id;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'expired', 'sent', 'expired', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'quote_id', v_q.id, 'status', 'expired');
END;
$function$;

-- ============================================================
-- 11) RPC: quote_revise
-- ============================================================
CREATE OR REPLACE FUNCTION public.quote_revise(p_quote_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid; v_tenant uuid; v_q public.quotes%ROWTYPE;
  v_existing uuid; v_new_id uuid; v_from text;
BEGIN
  SELECT _uid, _tenant INTO v_uid, v_tenant FROM public._quote_rpc_authorize();
  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found: quote'; END IF;
  IF v_q.tenant_id <> v_tenant THEN RAISE EXCEPTION 'permission_denied: tenant mismatch'; END IF;

  -- Idempotência: já existe draft revisado deste original?
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

  -- Cria novo draft
  INSERT INTO public.quotes(
    tenant_id, customer_id, device_id, service_order_id,
    title, description, valid_until, discount_amount,
    parent_quote_id, version, status, created_by, updated_by
  ) VALUES (
    v_q.tenant_id, v_q.customer_id, v_q.device_id, v_q.service_order_id,
    v_q.title, v_q.description, v_q.valid_until, v_q.discount_amount,
    v_q.id, COALESCE(v_q.version,1) + 1, 'draft', v_uid, v_uid
  ) RETURNING id INTO v_new_id;

  -- Copia itens
  INSERT INTO public.quote_items(
    tenant_id, quote_id, item_type, product_id, description,
    quantity, unit_cost, unit_price
  )
  SELECT v_q.tenant_id, v_new_id, item_type, product_id, description,
         quantity, unit_cost, unit_price
    FROM public.quote_items WHERE quote_id = v_q.id;

  PERFORM public.recalculate_quote_totals(v_new_id);

  -- Move original para revised
  UPDATE public.quotes SET status='revised', updated_by=v_uid WHERE id = v_q.id;

  PERFORM public._quote_log_event(v_q.id, v_tenant, v_uid, 'revised', v_from, 'revised',
    jsonb_build_object('new_quote_id', v_new_id));
  PERFORM public._quote_log_event(v_new_id, v_tenant, v_uid, 'revision_created', NULL, 'draft',
    jsonb_build_object('parent_quote_id', v_q.id, 'version', COALESCE(v_q.version,1) + 1));

  RETURN jsonb_build_object('ok', true, 'original_quote_id', v_q.id,
                            'new_quote_id', v_new_id, 'new_status', 'draft',
                            'version', COALESCE(v_q.version,1) + 1);
END;
$function$;

-- 12) Permissões — execução para usuários autenticados
REVOKE ALL ON FUNCTION public.quote_send(uuid) FROM public;
REVOKE ALL ON FUNCTION public.quote_approve(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.quote_reject(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.quote_cancel(uuid, text) FROM public;
REVOKE ALL ON FUNCTION public.quote_expire(uuid) FROM public;
REVOKE ALL ON FUNCTION public.quote_revise(uuid) FROM public;

GRANT EXECUTE ON FUNCTION public.quote_send(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_approve(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_reject(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_cancel(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_expire(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quote_revise(uuid) TO authenticated;
