-- Fix: update sale payment_status to 'paid' since financial_entries confirms payment
UPDATE public.sales 
SET payment_status = 'paid'::sale_payment_status,
    updated_at = now()
WHERE id = 'cc565efe-b81e-4646-98ef-4824f107b13e'
  AND payment_status = 'pending'::sale_payment_status;

-- Also insert corresponding sale_payment record to keep tables in sync
INSERT INTO public.sale_payments (sale_id, payment_method, amount, tenant_id)
SELECT 
  'cc565efe-b81e-4646-98ef-4824f107b13e',
  'pix'::sale_payment_method,
  60,
  '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (
  SELECT 1 FROM sale_payments WHERE sale_id = 'cc565efe-b81e-4646-98ef-4824f107b13e'
);