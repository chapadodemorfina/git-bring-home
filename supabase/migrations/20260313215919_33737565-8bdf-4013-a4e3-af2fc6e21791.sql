
-- Fix: operational_select_customers references auth.users directly, which causes
-- "permission denied for table users" for the authenticated role.
-- Replace with auth.jwt() ->> 'email' which reads from the JWT token instead.

DROP POLICY IF EXISTS "operational_select_customers" ON customers;
CREATE POLICY "operational_select_customers" ON customers
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'front_desk'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role, 'finance'::app_role])
    OR (
      has_role(auth.uid(), 'customer'::app_role)
      AND email = (auth.jwt() ->> 'email')
    )
  );
