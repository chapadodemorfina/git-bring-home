
-- Fix sales_goals RLS: replace permissive policy with restrictive tenant isolation + role-based policies

-- Drop the old permissive policy
DROP POLICY IF EXISTS "sales_goals_tenant_isolation" ON sales_goals;

-- 1. RESTRICTIVE tenant isolation (mandatory filter)
CREATE POLICY "tenant_isolation_sales_goals"
ON sales_goals AS RESTRICTIVE
FOR ALL TO authenticated
USING (tenant_id = get_active_tenant_id())
WITH CHECK (tenant_id = get_active_tenant_id());

-- 2. Admins/managers/finance can manage goals (CRUD)
CREATE POLICY "Admins can manage goals"
ON sales_goals AS PERMISSIVE
FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'finance'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'finance'::app_role]));

-- 3. Staff can read goals (to see their own progress)
CREATE POLICY "Staff can read goals"
ON sales_goals AS PERMISSIVE
FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'finance'::app_role, 'front_desk'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));
