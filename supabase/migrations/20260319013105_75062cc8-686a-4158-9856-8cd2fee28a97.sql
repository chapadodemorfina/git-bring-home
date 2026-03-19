
-- 1. Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2),
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  max_users int NOT NULL DEFAULT 1,
  max_service_orders_per_month int NOT NULL DEFAULT 50,
  max_products int NOT NULL DEFAULT 100,
  features jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read_all" ON public.plans FOR SELECT TO authenticated USING (true);

-- 2. Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trialing',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  stripe_subscription_id text,
  stripe_customer_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE OR REPLACE FUNCTION public.trg_validate_subscription_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('trialing','active','past_due','canceled','unpaid','incomplete') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  IF NEW.billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: %', NEW.billing_cycle;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_subscription_status
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_subscription_status();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_isolation" ON public.subscriptions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "subscriptions_modify" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin']::app_role[]));

-- 3. Seed plans
INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, max_users, max_service_orders_per_month, max_products, sort_order) VALUES
  ('Starter', 'starter', 'Para pequenas assistências', 49.90, 479.00, 2, 50, 100, 1),
  ('Professional', 'professional', 'Para assistências em crescimento', 99.90, 959.00, 5, 200, 500, 2),
  ('Business', 'business', 'Para operações robustas', 199.90, 1919.00, 15, 1000, 2000, 3),
  ('Enterprise', 'enterprise', 'Sem limites, suporte prioritário', 399.90, 3839.00, 999999, 999999, 999999, 4);

-- 4. check_plan_limits
CREATE OR REPLACE FUNCTION public.check_plan_limits(_tenant_id uuid, _resource_type text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan plans%ROWTYPE;
  _sub subscriptions%ROWTYPE;
  _current_count int;
  _limit int;
BEGIN
  SELECT s.* INTO _sub FROM subscriptions s
  WHERE s.tenant_id = _tenant_id AND s.status IN ('active', 'trialing') LIMIT 1;

  IF _sub IS NULL THEN
    RAISE EXCEPTION 'Tenant sem assinatura ativa. Assine um plano para continuar.' USING ERRCODE = 'P0001';
  END IF;

  IF _sub.status = 'trialing' AND _sub.trial_ends_at < now() THEN
    RAISE EXCEPTION 'Período de teste expirado. Assine um plano para continuar.' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.* INTO _plan FROM plans p WHERE p.id = _sub.plan_id;
  IF _plan IS NULL THEN
    RAISE EXCEPTION 'Plano não encontrado.' USING ERRCODE = 'P0001';
  END IF;

  IF _resource_type = 'users' THEN
    SELECT count(*) INTO _current_count FROM tenant_users tu WHERE tu.tenant_id = _tenant_id;
    _limit := _plan.max_users;
  ELSIF _resource_type = 'service_orders' THEN
    SELECT count(*) INTO _current_count FROM service_orders so
    WHERE so.tenant_id = _tenant_id AND so.created_at >= date_trunc('month', now());
    _limit := _plan.max_service_orders_per_month;
  ELSIF _resource_type = 'products' THEN
    SELECT count(*) INTO _current_count FROM products p2 WHERE p2.tenant_id = _tenant_id;
    _limit := _plan.max_products;
  ELSE
    RAISE EXCEPTION 'Tipo de recurso desconhecido: %', _resource_type USING ERRCODE = 'P0001';
  END IF;

  IF _current_count >= _limit THEN
    RAISE EXCEPTION 'Limite do plano atingido para %. Atual: %, Limite: %. Faça upgrade do plano.', _resource_type, _current_count, _limit USING ERRCODE = 'P0001';
  END IF;

  RETURN true;
END;
$$;

-- 5. Triggers on tables
CREATE OR REPLACE FUNCTION public.trg_check_service_order_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM check_plan_limits(NEW.tenant_id, 'service_orders'); RETURN NEW; END; $$;

CREATE TRIGGER check_service_order_plan_limit
  BEFORE INSERT ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.trg_check_service_order_limit();

CREATE OR REPLACE FUNCTION public.trg_check_product_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM check_plan_limits(NEW.tenant_id, 'products'); RETURN NEW; END; $$;

CREATE TRIGGER check_product_plan_limit
  BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.trg_check_product_limit();

CREATE OR REPLACE FUNCTION public.trg_check_user_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM check_plan_limits(NEW.tenant_id, 'users'); RETURN NEW; END; $$;

CREATE TRIGGER check_user_plan_limit
  BEFORE INSERT ON public.tenant_users FOR EACH ROW EXECUTE FUNCTION public.trg_check_user_limit();

-- 6. get_plan_usage
CREATE OR REPLACE FUNCTION public.get_plan_usage(_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan plans%ROWTYPE; _sub subscriptions%ROWTYPE;
  _users_count int; _orders_count int; _products_count int;
BEGIN
  SELECT s.* INTO _sub FROM subscriptions s
  WHERE s.tenant_id = _tenant_id AND s.status IN ('active', 'trialing') LIMIT 1;
  IF _sub IS NULL THEN RETURN jsonb_build_object('has_subscription', false); END IF;

  SELECT p.* INTO _plan FROM plans p WHERE p.id = _sub.plan_id;
  SELECT count(*) INTO _users_count FROM tenant_users tu WHERE tu.tenant_id = _tenant_id;
  SELECT count(*) INTO _orders_count FROM service_orders so WHERE so.tenant_id = _tenant_id AND so.created_at >= date_trunc('month', now());
  SELECT count(*) INTO _products_count FROM products p2 WHERE p2.tenant_id = _tenant_id;

  RETURN jsonb_build_object(
    'has_subscription', true, 'plan_name', _plan.name, 'plan_slug', _plan.slug,
    'status', _sub.status, 'trial_ends_at', _sub.trial_ends_at,
    'current_period_end', _sub.current_period_end,
    'users', jsonb_build_object('current', _users_count, 'limit', _plan.max_users),
    'service_orders', jsonb_build_object('current', _orders_count, 'limit', _plan.max_service_orders_per_month),
    'products', jsonb_build_object('current', _products_count, 'limit', _plan.max_products)
  );
END;
$$;

-- 7. Auto trial on new tenant
CREATE OR REPLACE FUNCTION public.trg_auto_trial_on_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _starter_plan_id uuid;
BEGIN
  SELECT id INTO _starter_plan_id FROM plans WHERE slug = 'starter' LIMIT 1;
  IF _starter_plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at)
    VALUES (NEW.id, _starter_plan_id, 'trialing', now() + interval '7 days');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_trial_subscription
  AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.trg_auto_trial_on_tenant();
