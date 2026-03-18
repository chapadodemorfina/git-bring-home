
-- Auto-create receivable after sale completion (if not fully paid)
CREATE OR REPLACE FUNCTION public.auto_create_sale_receivable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_paid NUMERIC;
  _remaining NUMERIC;
BEGIN
  -- Only on status change to 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _total_paid FROM sale_payments WHERE sale_id = NEW.id;
  _remaining := NEW.total_amount - _total_paid;

  IF _remaining > 0.01 THEN
    INSERT INTO accounts_receivable (customer_id, reference_type, reference_id, description, total_amount, amount_received, due_date, status, created_by)
    VALUES (
      NEW.customer_id,
      'sale',
      NEW.id,
      'Venda ' || COALESCE(NEW.sale_number, NEW.id::text),
      _remaining,
      0,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'pending',
      auth.uid()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_sale_receivable
  AFTER UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_sale_receivable();

-- Auto-create receivable after OS delivery (if not fully paid)
CREATE OR REPLACE FUNCTION public.auto_create_so_receivable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _quote RECORD;
  _total_paid NUMERIC;
  _remaining NUMERIC;
BEGIN
  IF NEW.status <> 'delivered' OR OLD.status = 'delivered' THEN RETURN NEW; END IF;

  -- Get approved quote
  SELECT * INTO _quote FROM repair_quotes
    WHERE service_order_id = NEW.id AND status = 'approved'
    ORDER BY updated_at DESC LIMIT 1;

  IF NOT FOUND OR COALESCE(_quote.total_amount, 0) <= 0 THEN RETURN NEW; END IF;

  -- Check how much was paid via financial_entries
  SELECT COALESCE(SUM(paid_amount), 0) INTO _total_paid
  FROM financial_entries
  WHERE service_order_id = NEW.id AND entry_type = 'revenue' AND status <> 'cancelled';

  _remaining := _quote.total_amount - _total_paid;

  IF _remaining > 0.01 THEN
    INSERT INTO accounts_receivable (customer_id, reference_type, reference_id, description, total_amount, amount_received, due_date, status, created_by)
    VALUES (
      NEW.customer_id,
      'service_order',
      NEW.id,
      'OS ' || COALESCE(NEW.order_number, NEW.id::text),
      _remaining,
      0,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'pending',
      auth.uid()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_so_receivable
  AFTER UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_so_receivable();
