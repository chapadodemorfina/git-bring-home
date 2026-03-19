
-- Function: onboard_tenant
-- Called after signup to create tenant + owner membership + profile + trial subscription
-- All in a single transaction
CREATE OR REPLACE FUNCTION public.onboard_tenant(
  _user_id uuid,
  _user_email text,
  _user_name text,
  _company_name text,
  _company_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _plan_id uuid;
  _sub_id uuid;
BEGIN
  -- 1. Create the tenant
  INSERT INTO tenants (name, slug, is_active)
  VALUES (_company_name, _company_slug, true)
  RETURNING id INTO _tenant_id;

  -- 2. Associate user as owner
  INSERT INTO tenant_users (tenant_id, user_id, tenant_role, is_default, is_active)
  VALUES (_tenant_id, _user_id, 'owner', true, true);

  -- 3. Create profile if not exists
  INSERT INTO profiles (id, full_name, email, is_active)
  VALUES (_user_id, _user_name, _user_email, true)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Give admin role
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 5. Create trial subscription (find starter plan)
  SELECT id INTO _plan_id FROM plans WHERE slug = 'starter' LIMIT 1;
  
  IF _plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES (
      _tenant_id,
      _plan_id,
      'trialing',
      now() + interval '7 days',
      now(),
      now() + interval '7 days'
    )
    RETURNING id INTO _sub_id;
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', _tenant_id,
    'subscription_id', _sub_id
  );
END;
$$;
