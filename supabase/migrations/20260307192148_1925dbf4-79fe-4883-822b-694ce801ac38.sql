
-- Financial entry type
CREATE TYPE public.financial_entry_type AS ENUM ('revenue', 'expense', 'commission');

-- Financial entry status
CREATE TYPE public.financial_entry_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'cancelled');

-- Payment method
CREATE TYPE public.payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'boleto', 'check', 'other');

-- Main financial entries table (unified receivables + payables + commissions)
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type public.financial_entry_type NOT NULL,
  status public.financial_entry_status NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  
  -- References
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.repair_quotes(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  collection_point_id UUID REFERENCES public.collection_points(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  category TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table (individual payments against entries)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financial_entry_id UUID REFERENCES public.financial_entries(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'pix',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_financial_entries_type ON public.financial_entries(entry_type);
CREATE INDEX idx_financial_entries_status ON public.financial_entries(status);
CREATE INDEX idx_financial_entries_so ON public.financial_entries(service_order_id);
CREATE INDEX idx_financial_entries_customer ON public.financial_entries(customer_id);
CREATE INDEX idx_financial_entries_supplier ON public.financial_entries(supplier_id);
CREATE INDEX idx_payments_entry ON public.payments(financial_entry_id);

-- Updated_at trigger
CREATE TRIGGER set_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view financial_entries" ON public.financial_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert financial_entries" ON public.financial_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update financial_entries" ON public.financial_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete financial_entries" ON public.financial_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete payments" ON public.payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
