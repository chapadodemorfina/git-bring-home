
-- 1. Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  document TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Tenant role enum
DO $$ BEGIN
  CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tenant users table (many-to-many: user <-> tenant)
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_role public.tenant_role DEFAULT 'member' NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- 5. Updated_at trigger for tenants
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Security definer: get user's tenant IDs (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = _user_id AND is_active = true;
$$;

-- 7. Security definer: check if user is tenant admin/owner
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id
    AND tenant_role IN ('owner', 'admin') AND is_active = true
  );
$$;

-- 8. Get active tenant from request header (set by frontend via custom fetch)
--    Validates user membership. Falls back to default tenant.
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _header_val TEXT;
  _tenant_id UUID;
BEGIN
  -- Read from PostgREST request header (injected by Supabase client custom fetch)
  _header_val := current_setting('request.header.x-tenant-id', true);

  IF _header_val IS NOT NULL AND _header_val != '' THEN
    -- Validate the user actually belongs to this tenant
    SELECT tu.tenant_id INTO _tenant_id
    FROM public.tenant_users tu
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = _header_val::uuid
      AND tu.is_active = true;

    IF _tenant_id IS NOT NULL THEN
      RETURN _tenant_id;
    END IF;
  END IF;

  -- Fallback: user's default tenant
  SELECT tu.tenant_id INTO _tenant_id
  FROM public.tenant_users tu
  WHERE tu.user_id = auth.uid() AND tu.is_active = true
  ORDER BY tu.is_default DESC, tu.created_at ASC
  LIMIT 1;

  RETURN _tenant_id;
END;
$$;

-- 9. RPC to create a new tenant (with caller as owner)
CREATE OR REPLACE FUNCTION public.create_tenant(_name TEXT, _slug TEXT, _document TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _tenant_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  INSERT INTO public.tenants (name, slug, document)
  VALUES (_name, _slug, _document)
  RETURNING id INTO _tenant_id;

  INSERT INTO public.tenant_users (tenant_id, user_id, tenant_role, is_default)
  VALUES (_tenant_id, _user_id, 'owner', true);

  RETURN jsonb_build_object('tenant_id', _tenant_id);
END;
$$;

-- 10. RPC to switch active tenant (validates membership, sets default)
CREATE OR REPLACE FUNCTION public.switch_tenant(_tenant_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Você não pertence a este tenant';
  END IF;

  -- Remove default flag from all
  UPDATE public.tenant_users SET is_default = false
  WHERE user_id = _user_id AND is_default = true;

  -- Set new default
  UPDATE public.tenant_users SET is_default = true
  WHERE user_id = _user_id AND tenant_id = _tenant_id;

  RETURN jsonb_build_object('success', true, 'tenant_id', _tenant_id);
END;
$$;

-- 11. RLS policies for tenants
CREATE POLICY "tenant_select" ON public.tenants
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE POLICY "tenant_update" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_tenant_admin(auth.uid(), id));

-- 12. RLS policies for tenant_users
CREATE POLICY "tenant_users_select_own" ON public.tenant_users
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid()))
  );

CREATE POLICY "tenant_users_manage" ON public.tenant_users
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
