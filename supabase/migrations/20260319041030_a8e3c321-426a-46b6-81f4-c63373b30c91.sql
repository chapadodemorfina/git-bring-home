ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_provider text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_customer_id text,
  ADD COLUMN IF NOT EXISTS external_subscription_id text;

DROP POLICY IF EXISTS "Tenant members can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Tenant admins can update subscription" ON public.subscriptions;

CREATE POLICY "Tenant members can view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (tenant_id = get_active_tenant_id());

CREATE POLICY "Tenant admins can update subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (tenant_id = get_active_tenant_id() AND is_tenant_admin(auth.uid(), get_active_tenant_id()))
  WITH CHECK (tenant_id = get_active_tenant_id() AND is_tenant_admin(auth.uid(), get_active_tenant_id()));
