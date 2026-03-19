-- Drop the OLD 3-arg close_cash_register that doesn't handle bank balance
-- Keep only the 4-arg version that handles dual reconciliation
DROP FUNCTION IF EXISTS public.close_cash_register(uuid, numeric, text);
