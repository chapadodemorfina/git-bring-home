
DROP POLICY IF EXISTS "Authenticated users can view receivables" ON public.accounts_receivable;

CREATE POLICY "Admin/manager/finance can view receivables"
  ON public.accounts_receivable
  FOR SELECT
  TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'finance'::app_role])
  );
