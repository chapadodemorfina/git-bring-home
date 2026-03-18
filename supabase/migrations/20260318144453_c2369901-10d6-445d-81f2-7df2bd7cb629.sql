
-- Accounts Receivable table
CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  reference_type TEXT NOT NULL DEFAULT 'manual', -- sale, service_order, manual
  reference_id UUID,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (total_amount - amount_received) STORED,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, partial, paid, overdue, cancelled
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receivable Payments table
CREATE TABLE public.receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ar_customer ON public.accounts_receivable(customer_id);
CREATE INDEX idx_ar_status ON public.accounts_receivable(status);
CREATE INDEX idx_ar_due_date ON public.accounts_receivable(due_date);
CREATE INDEX idx_ar_reference ON public.accounts_receivable(reference_type, reference_id);
CREATE INDEX idx_rp_receivable ON public.receivable_payments(receivable_id);

-- Unique constraint to prevent duplicate receivables for the same reference
CREATE UNIQUE INDEX idx_ar_unique_ref ON public.accounts_receivable(reference_type, reference_id) WHERE reference_type <> 'manual' AND status <> 'cancelled';

-- Updated_at trigger
CREATE TRIGGER set_ar_updated_at BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receivables" ON public.accounts_receivable
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager/finance can insert receivables" ON public.accounts_receivable
  FOR INSERT TO authenticated WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','finance','front_desk']::app_role[])
  );

CREATE POLICY "Admin/manager/finance can update receivables" ON public.accounts_receivable
  FOR UPDATE TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[])
  );

CREATE POLICY "Admin/manager can delete receivables" ON public.accounts_receivable
  FOR DELETE TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[])
  );

CREATE POLICY "Authenticated users can view receivable payments" ON public.receivable_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/manager/finance/front_desk can insert payments" ON public.receivable_payments
  FOR INSERT TO authenticated WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','finance','front_desk']::app_role[])
  );

-- RPC: Register payment on receivable (atomic)
CREATE OR REPLACE FUNCTION public.register_receivable_payment(
  _receivable_id UUID,
  _amount NUMERIC,
  _payment_method TEXT DEFAULT 'pix',
  _notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rec accounts_receivable%ROWTYPE;
  _new_received NUMERIC;
  _new_status TEXT;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();

  SELECT * INTO _rec FROM accounts_receivable WHERE id = _receivable_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta a receber não encontrada'; END IF;
  IF _rec.status = 'cancelled' THEN RAISE EXCEPTION 'Conta cancelada'; END IF;
  IF _rec.status = 'paid' THEN RAISE EXCEPTION 'Conta já quitada'; END IF;

  _new_received := _rec.amount_received + _amount;
  IF _new_received > _rec.total_amount THEN
    RAISE EXCEPTION 'Pagamento excede o saldo restante';
  END IF;

  IF _new_received >= _rec.total_amount THEN _new_status := 'paid';
  ELSE _new_status := 'partial';
  END IF;

  INSERT INTO receivable_payments (receivable_id, amount, payment_method, notes, created_by)
  VALUES (_receivable_id, _amount, _payment_method, _notes, _user_id);

  UPDATE accounts_receivable SET amount_received = _new_received, status = _new_status WHERE id = _receivable_id;

  -- Create financial entry for the payment
  INSERT INTO financial_entries (entry_type, description, amount, paid_amount, customer_id, category, status, created_by)
  VALUES ('revenue', 'Recebimento - ' || _rec.description, _amount, _amount, _rec.customer_id, 'receivable_payment', 'paid', _user_id);

  RETURN jsonb_build_object('success', true, 'new_received', _new_received, 'new_status', _new_status);
END;
$$;

-- RPC: Summary for dashboard cards
CREATE OR REPLACE FUNCTION public.receivables_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total_receivable', COALESCE(SUM(remaining_amount) FILTER (WHERE status IN ('pending','partial','overdue')), 0),
      'total_overdue', COALESCE(SUM(remaining_amount) FILTER (WHERE status = 'overdue'), 0),
      'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue'),
      'received_month', COALESCE(SUM(amount_received) FILTER (
        WHERE status IN ('paid','partial') AND updated_at >= date_trunc('month', CURRENT_DATE)
      ), 0),
      'open_count', COUNT(*) FILTER (WHERE status IN ('pending','partial','overdue')),
      'total_count', COUNT(*)
    )
    FROM accounts_receivable
    WHERE status <> 'cancelled'
  );
END;
$$;

-- Function to mark overdue receivables
CREATE OR REPLACE FUNCTION public.mark_overdue_receivables()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _count integer;
BEGIN
  WITH updated AS (
    UPDATE accounts_receivable
    SET status = 'overdue', updated_at = now()
    WHERE status IN ('pending', 'partial')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO _count FROM updated;
  RETURN _count;
END;
$$;
