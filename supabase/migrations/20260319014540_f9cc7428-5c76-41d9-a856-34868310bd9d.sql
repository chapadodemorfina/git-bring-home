
-- Add set_config layer: allow Edge Functions to set tenant context via app.current_tenant_id
-- Update get_active_tenant_id to also check app.current_tenant_id (for service_role contexts)
CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _header_val TEXT;
  _config_val TEXT;
  _tenant_id UUID;
BEGIN
  -- 1. Check app.current_tenant_id (set by Edge Functions via set_config)
  _config_val := current_setting('app.current_tenant_id', true);
  IF _config_val IS NOT NULL AND _config_val != '' THEN
    BEGIN
      _tenant_id := _config_val::uuid;
      -- Validate membership if auth.uid() is available
      IF auth.uid() IS NOT NULL THEN
        PERFORM 1 FROM public.tenant_users
        WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND is_active = true;
        IF FOUND THEN RETURN _tenant_id; END IF;
      ELSE
        -- Service role context: trust the config value
        RETURN _tenant_id;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      -- ignore bad uuid
    END;
  END IF;

  -- 2. Check PostgREST request header (injected by frontend)
  _header_val := current_setting('request.header.x-tenant-id', true);
  IF _header_val IS NOT NULL AND _header_val != '' THEN
    BEGIN
      SELECT tu.tenant_id INTO _tenant_id
      FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = _header_val::uuid
        AND tu.is_active = true;
      IF _tenant_id IS NOT NULL THEN RETURN _tenant_id; END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      -- ignore bad uuid
    END;
  END IF;

  -- 3. Fallback: user's default tenant
  SELECT tu.tenant_id INTO _tenant_id
  FROM public.tenant_users tu
  WHERE tu.user_id = auth.uid() AND tu.is_active = true
  ORDER BY tu.is_default DESC, tu.created_at ASC
  LIMIT 1;

  RETURN _tenant_id;
END;
$$;

-- Helper: set tenant context for Edge Functions using service_role
CREATE OR REPLACE FUNCTION public.set_tenant_context(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', _tenant_id::text, true);
END;
$$;
