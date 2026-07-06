-- Fase 3.5.12.5-d: Endurecer policies finais de criação de venda.
-- Toda criação/edição/pagamento/cancelamento/devolução passa por RPCs SECURITY DEFINER:
--   create_sale, update_draft_sale, complete_sale, cancel_sale,
--   process_sale_payment, process_sale_return.
-- Nenhum fluxo client-side legítimo ainda depende de INSERT/UPDATE/DELETE direto
-- em sales, sale_items ou sale_payments (validado por grep no src/).
-- Removemos as policies permissivas de escrita; preservamos SELECT e RESTRICTIVE tenant_isolation.

-- sales
DROP POLICY IF EXISTS sales_insert ON public.sales;
DROP POLICY IF EXISTS sales_update ON public.sales;

-- sale_items
DROP POLICY IF EXISTS sale_items_insert ON public.sale_items;
DROP POLICY IF EXISTS sale_items_update ON public.sale_items;
DROP POLICY IF EXISTS sale_items_delete ON public.sale_items;

-- sale_payments
DROP POLICY IF EXISTS sale_payments_insert_draft_only ON public.sale_payments;