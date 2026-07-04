-- Phase 2A.5d-6c: Harden RLS on public.commission_entries
-- Drop broad INSERT policy (writes only via SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "System can insert commissions" ON public.commission_entries;

-- Replace SELECT policy: remove unused self-read branch
DROP POLICY IF EXISTS "Admins and finance can read all commissions" ON public.commission_entries;

CREATE POLICY "commission_entries_select_privileged"
ON public.commission_entries
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  tenant_id = get_active_tenant_id()
  AND has_any_role(
    auth.uid(),
    ARRAY['admin','manager','finance']::app_role[]
  )
);

-- tenant_isolation_commission_entries (RESTRICTIVE ALL) preserved
-- "Admins can update commissions" (UPDATE) preserved
-- No DELETE policy (blocked) preserved
