-- Fase 2A.5d-6a: Endurecer RLS de cp_commission_periods
-- 1) Drop policy única atual (RESTRICTIVE FOR ALL para authenticated)
DROP POLICY IF EXISTS cp_commission_periods_tenant_isolation ON public.cp_commission_periods;

-- 2) RESTRICTIVE tenant boundary (aplica-se a TODOS os comandos)
CREATE POLICY cp_commission_periods_tenant_boundary
ON public.cp_commission_periods
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (tenant_id = get_active_tenant_id())
WITH CHECK (tenant_id = get_active_tenant_id());

-- 3) PERMISSIVE SELECT apenas para admin/manager/finance
CREATE POLICY cp_commission_periods_select_privileged
ON public.cp_commission_periods
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  tenant_id = get_active_tenant_id()
  AND has_any_role(auth.uid(), ARRAY['admin','manager','finance']::app_role[])
);

-- Nenhuma policy PERMISSIVE de INSERT/UPDATE/DELETE:
-- escrita direta pelo client permanece bloqueada.
-- Mutações continuam exclusivamente pelas RPCs SECURITY DEFINER blindadas.