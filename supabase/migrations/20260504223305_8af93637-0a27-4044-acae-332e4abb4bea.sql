-- ============================================================
-- HOTFIX FASE 1 - Hardening de quotes (allowlist + RLS estrita)
-- ============================================================

-- 1) State machine: remove revised->draft
CREATE OR REPLACE FUNCTION public.enforce_quote_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _from text := OLD.status;
  _to   text := NEW.status;
  _ok   boolean := false;
BEGIN
  IF _from = _to THEN RETURN NEW; END IF;

  _ok := (_from, _to) IN (
    ('draft','sent'), ('draft','cancelled'),
    ('sent','approved'), ('sent','rejected'),
    ('sent','expired'), ('sent','cancelled'),
    ('approved','converted'),
    ('rejected','revised'),
    ('expired','revised'),
    ('cancelled','revised')
    -- revised -> draft removido propositalmente (rastreabilidade)
  );

  IF NOT _ok THEN
    RAISE EXCEPTION 'invalid_quote_status_transition: % -> % not allowed', _from, _to;
  END IF;

  -- Carimbos automáticos pela própria transição
  IF _to = 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  IF _to = 'rejected' AND NEW.rejected_at IS NULL THEN
    NEW.rejected_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) protect_locked_quote — abordagem ALLOWLIST
-- Para qualquer status != 'draft', somente os seguintes campos podem mudar:
--   status, updated_at, approved_at (na transição p/ approved),
--   rejected_at + rejection_reason (na transição p/ rejected).
-- Qualquer outra mudança é bloqueada (cobre todos os campos atuais e futuros).
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
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved','converted','sent') THEN
      RAISE EXCEPTION 'quote_locked: cannot delete % quote', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  -- Em draft, libera (outros triggers cuidam de discount/recálculo).
  IF OLD.status = 'draft' THEN
    RETURN NEW;
  END IF;

  -- converted é terminal absoluto
  IF OLD.status = 'converted' THEN
    RAISE EXCEPTION 'quote_locked: converted quote is immutable';
  END IF;

  _status_changed   := OLD.status IS DISTINCT FROM NEW.status;
  _is_approve_stamp := _status_changed AND NEW.status = 'approved';
  _is_reject_stamp  := _status_changed AND NEW.status = 'rejected';

  -- Allowlist de campos que PODEM mudar fora de draft:
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
  THEN
    RAISE EXCEPTION 'quote_material_fields_locked: only status/timestamps allowed when status=%', OLD.status;
  END IF;

  -- approved_at só pode mudar na transição -> approved
  IF (OLD.approved_at IS DISTINCT FROM NEW.approved_at) AND NOT _is_approve_stamp THEN
    RAISE EXCEPTION 'quote_locked: approved_at can only be set by status transition to approved';
  END IF;

  -- rejected_at e rejection_reason só na transição -> rejected
  IF (OLD.rejected_at IS DISTINCT FROM NEW.rejected_at) AND NOT _is_reject_stamp THEN
    RAISE EXCEPTION 'quote_locked: rejected_at can only be set by status transition to rejected';
  END IF;
  IF (OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason) AND NOT _is_reject_stamp THEN
    RAISE EXCEPTION 'quote_locked: rejection_reason can only be set by status transition to rejected';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) RLS — UPDATE estrito a draft|sent (trigger faz o resto)
DROP POLICY IF EXISTS quotes_update_draft_only ON public.quotes;
DROP POLICY IF EXISTS quotes_update_client ON public.quotes;
CREATE POLICY quotes_update_client ON public.quotes
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role,'front_desk'::app_role,'bench_technician'::app_role,'field_technician'::app_role,'finance'::app_role])
  AND status IN ('draft','sent')
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role,'manager'::app_role,'front_desk'::app_role,'bench_technician'::app_role,'field_technician'::app_role,'finance'::app_role])
);

-- DELETE permanece restrito a admin/manager + status=draft (já existente).

-- Garante triggers ativos (idempotente)
DROP TRIGGER IF EXISTS trg_enforce_quote_status_transition ON public.quotes;
CREATE TRIGGER trg_enforce_quote_status_transition
BEFORE UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_status_transition();

DROP TRIGGER IF EXISTS trg_protect_locked_quote ON public.quotes;
CREATE TRIGGER trg_protect_locked_quote
BEFORE UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.protect_locked_quote();