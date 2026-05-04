
-- =========================================================
-- FASE 1: HARDENING DE QUOTES (comercial)
-- =========================================================

-- ---------- 1. Validação de desconto ----------
CREATE OR REPLACE FUNCTION public.validate_quote_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subtotal numeric;
BEGIN
  IF NEW.discount_amount IS NULL THEN
    NEW.discount_amount := 0;
  END IF;
  IF NEW.discount_amount < 0 THEN
    RAISE EXCEPTION 'invalid_quote_discount: discount_amount cannot be negative';
  END IF;
  _subtotal := COALESCE(NEW.subtotal_parts,0) + COALESCE(NEW.subtotal_labor,0) + COALESCE(NEW.subtotal_other,0);
  IF NEW.discount_amount > _subtotal THEN
    RAISE EXCEPTION 'invalid_quote_discount: discount_amount (%) greater than subtotal (%)', NEW.discount_amount, _subtotal;
  END IF;
  IF COALESCE(NEW.total_amount,0) < 0 THEN
    RAISE EXCEPTION 'invalid_quote_discount: total_amount cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_quote_discount ON public.quotes;
CREATE TRIGGER trg_validate_quote_discount
BEFORE INSERT OR UPDATE OF discount_amount, subtotal_parts, subtotal_labor, subtotal_other, total_amount
ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.validate_quote_discount();


-- ---------- 2. Máquina de estados ----------
CREATE OR REPLACE FUNCTION public.enforce_quote_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    ('cancelled','revised'),
    ('revised','draft')  -- permite reedição após revisão
  );

  IF NOT _ok THEN
    RAISE EXCEPTION 'invalid_quote_status_transition: % -> % not allowed', _from, _to;
  END IF;

  -- carimbos automáticos
  IF _to = 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  IF _to = 'rejected' AND NEW.rejected_at IS NULL THEN
    NEW.rejected_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quote_status_transition ON public.quotes;
CREATE TRIGGER trg_enforce_quote_status_transition
BEFORE UPDATE OF status ON public.quotes
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.enforce_quote_status_transition();


-- ---------- 3. Proteção de quote aprovado/convertido ----------
CREATE OR REPLACE FUNCTION public.protect_locked_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved','converted') THEN
      RAISE EXCEPTION 'approved_quote_locked: cannot delete % quote', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.status IN ('approved','converted') THEN
    -- só permitido: approved -> converted (mudança de status pura)
    IF OLD.status = 'approved' AND NEW.status = 'converted' THEN
      -- nada material pode mudar
      IF (OLD.total_amount IS DISTINCT FROM NEW.total_amount)
         OR (OLD.subtotal_parts IS DISTINCT FROM NEW.subtotal_parts)
         OR (OLD.subtotal_labor IS DISTINCT FROM NEW.subtotal_labor)
         OR (OLD.subtotal_other IS DISTINCT FROM NEW.subtotal_other)
         OR (OLD.discount_amount IS DISTINCT FROM NEW.discount_amount)
         OR (OLD.total_cost IS DISTINCT FROM NEW.total_cost)
         OR (OLD.customer_id IS DISTINCT FROM NEW.customer_id)
         OR (OLD.device_id IS DISTINCT FROM NEW.device_id)
         OR (OLD.title IS DISTINCT FROM NEW.title)
         OR (OLD.description IS DISTINCT FROM NEW.description)
         OR (OLD.valid_until IS DISTINCT FROM NEW.valid_until)
         OR (OLD.approved_at IS DISTINCT FROM NEW.approved_at)
      THEN
        RAISE EXCEPTION 'approved_quote_locked: only status change approved->converted allowed';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'approved_quote_locked: quote is % and cannot be modified', OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_locked_quote_upd ON public.quotes;
CREATE TRIGGER trg_protect_locked_quote_upd
BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.protect_locked_quote();

DROP TRIGGER IF EXISTS trg_protect_locked_quote_del ON public.quotes;
CREATE TRIGGER trg_protect_locked_quote_del
BEFORE DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.protect_locked_quote();


-- ---------- 4. Bloqueio de itens fora de draft ----------
CREATE OR REPLACE FUNCTION public.protect_quote_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qid uuid := COALESCE(NEW.quote_id, OLD.quote_id);
  _status text;
BEGIN
  SELECT status INTO _status FROM public.quotes WHERE id = _qid;
  IF _status IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF _status <> 'draft' THEN
    RAISE EXCEPTION 'quote_items_locked: parent quote status is %, items only editable in draft', _status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_quote_items ON public.quote_items;
CREATE TRIGGER trg_protect_quote_items
BEFORE INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.protect_quote_items();


-- ---------- 5. Recalcular totais via trigger ----------
CREATE OR REPLACE FUNCTION public.trg_recalculate_quote_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _qid uuid := COALESCE(NEW.quote_id, OLD.quote_id);
BEGIN
  IF _qid IS NOT NULL THEN
    PERFORM public.recalculate_quote_totals(_qid);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_items_recalc ON public.quote_items;
CREATE TRIGGER trg_quote_items_recalc
AFTER INSERT OR UPDATE OF quantity, unit_price, unit_cost, item_type OR DELETE
ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.trg_recalculate_quote_totals();


-- ---------- 6. Histórico automático ----------
CREATE OR REPLACE FUNCTION public.trg_quote_history_auto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _payload jsonb := '{}'::jsonb;
  _changed boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.quote_history (tenant_id, quote_id, action, notes, created_by)
    VALUES (
      NEW.tenant_id, NEW.id, 'created',
      jsonb_build_object('status', NEW.status, 'total_amount', NEW.total_amount)::text,
      auth.uid()
    );
    RETURN NEW;
  END IF;

  -- UPDATE: registra apenas campos relevantes alterados
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    _payload := _payload || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    _changed := true;
    _action := 'status_changed:' || NEW.status;
  END IF;
  IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
    _payload := _payload || jsonb_build_object('total_amount', jsonb_build_object('old', OLD.total_amount, 'new', NEW.total_amount));
    _changed := true;
  END IF;
  IF OLD.discount_amount IS DISTINCT FROM NEW.discount_amount THEN
    _payload := _payload || jsonb_build_object('discount_amount', jsonb_build_object('old', OLD.discount_amount, 'new', NEW.discount_amount));
    _changed := true;
  END IF;
  IF (OLD.subtotal_parts + OLD.subtotal_labor + OLD.subtotal_other)
     IS DISTINCT FROM (NEW.subtotal_parts + NEW.subtotal_labor + NEW.subtotal_other) THEN
    _payload := _payload || jsonb_build_object(
      'subtotal',
      jsonb_build_object(
        'old', OLD.subtotal_parts + OLD.subtotal_labor + OLD.subtotal_other,
        'new', NEW.subtotal_parts + NEW.subtotal_labor + NEW.subtotal_other
      )
    );
    _changed := true;
  END IF;
  IF OLD.valid_until IS DISTINCT FROM NEW.valid_until THEN
    _payload := _payload || jsonb_build_object('valid_until', jsonb_build_object('old', OLD.valid_until, 'new', NEW.valid_until));
    _changed := true;
  END IF;
  IF OLD.approved_at IS DISTINCT FROM NEW.approved_at THEN
    _payload := _payload || jsonb_build_object('approved_at', jsonb_build_object('old', OLD.approved_at, 'new', NEW.approved_at));
    _changed := true;
  END IF;
  IF OLD.rejected_at IS DISTINCT FROM NEW.rejected_at THEN
    _payload := _payload || jsonb_build_object('rejected_at', jsonb_build_object('old', OLD.rejected_at, 'new', NEW.rejected_at));
    _changed := true;
  END IF;
  IF OLD.service_order_id IS DISTINCT FROM NEW.service_order_id THEN
    _payload := _payload || jsonb_build_object('service_order_id', jsonb_build_object('old', OLD.service_order_id, 'new', NEW.service_order_id));
    _changed := true;
  END IF;

  IF _changed THEN
    INSERT INTO public.quote_history (tenant_id, quote_id, action, notes, created_by)
    VALUES (
      NEW.tenant_id, NEW.id,
      COALESCE(_action, 'updated'),
      _payload::text,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_history_ins ON public.quotes;
CREATE TRIGGER trg_quote_history_ins
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.trg_quote_history_auto();

DROP TRIGGER IF EXISTS trg_quote_history_upd ON public.quotes;
CREATE TRIGGER trg_quote_history_upd
AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.trg_quote_history_auto();


-- ---------- 7. RLS revisada ----------

-- QUOTES
DROP POLICY IF EXISTS quotes_access ON public.quotes;

CREATE POLICY quotes_select_operational
ON public.quotes FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
);

CREATE POLICY quotes_insert_operational
ON public.quotes FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
  AND status = 'draft'
);

CREATE POLICY quotes_update_draft_only
ON public.quotes FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
  AND status IN ('draft','sent','rejected','expired','cancelled','revised')
)
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
);

CREATE POLICY quotes_delete_admin_draft
ON public.quotes FOR DELETE
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
  AND status = 'draft'
);

-- QUOTE_ITEMS
DROP POLICY IF EXISTS quote_items_access ON public.quote_items;

CREATE POLICY quote_items_select_operational
ON public.quote_items FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
);

CREATE POLICY quote_items_write_draft_only
ON public.quote_items FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
  AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.status = 'draft')
);

CREATE POLICY quote_items_update_draft_only
ON public.quote_items FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
  AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.status = 'draft')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.status = 'draft')
);

CREATE POLICY quote_items_delete_draft_only
ON public.quote_items FOR DELETE
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
  AND EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.status = 'draft')
);

-- QUOTE_HISTORY (append-only)
DROP POLICY IF EXISTS quote_history_access ON public.quote_history;

CREATE POLICY quote_history_select
ON public.quote_history FOR SELECT
USING (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
);

-- INSERT: permitido (trigger usa SECURITY DEFINER, mas mantemos policy para escritas manuais legítimas)
CREATE POLICY quote_history_insert
ON public.quote_history FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician','finance']::app_role[])
);

-- UPDATE/DELETE: SEM POLICY = bloqueado para clientes
