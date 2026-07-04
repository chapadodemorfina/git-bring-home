
-- =========================================================================
-- RPC: set_user_permission_override
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_user_permission_override(
  _target_user_id uuid,
  _permission_key text,
  _effect text,
  _reason text DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _actor uuid := auth.uid();
  _is_admin boolean;
  _is_manager boolean;
  _is_sensitive boolean;
  _old jsonb;
  _new_row public.user_permission_overrides%ROWTYPE;
  _existing public.user_permission_overrides%ROWTYPE;
  _target_active boolean;
  _admin_count int;
  _target_is_admin boolean;
BEGIN
  -- Auth basics
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'No active tenant' USING ERRCODE = '42501';
  END IF;

  -- Executor role gate
  _is_admin := public.has_role(_actor, 'admin'::app_role);
  _is_manager := public.has_role(_actor, 'manager'::app_role);
  IF NOT (_is_admin OR _is_manager) THEN
    RAISE EXCEPTION 'Insufficient privileges to manage permission overrides' USING ERRCODE = '42501';
  END IF;

  -- Self-management guard
  IF _actor = _target_user_id THEN
    RAISE EXCEPTION 'Cannot manage own permission overrides' USING ERRCODE = '42501';
  END IF;

  -- Effect validation
  IF _effect IS NULL OR _effect NOT IN ('allow','deny') THEN
    RAISE EXCEPTION 'Invalid effect: must be allow or deny' USING ERRCODE = '22023';
  END IF;

  -- Permission exists + sensitivity
  SELECT p.is_sensitive INTO _is_sensitive
  FROM public.permissions p
  WHERE p.key = _permission_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permission key does not exist: %', _permission_key USING ERRCODE = '22023';
  END IF;

  -- Sensitive permissions: admin-only in this phase
  IF _is_sensitive AND NOT _is_admin THEN
    RAISE EXCEPTION 'Only admin can manage sensitive permission overrides' USING ERRCODE = '42501';
  END IF;

  -- Target must be active in the current tenant
  SELECT COALESCE(tu.is_active, false) INTO _target_active
  FROM public.tenant_users tu
  WHERE tu.tenant_id = _tid AND tu.user_id = _target_user_id;
  IF NOT COALESCE(_target_active, false) THEN
    RAISE EXCEPTION 'Target user is not active in this tenant' USING ERRCODE = '42501';
  END IF;

  -- Last-admin critical guard: block deny on critical keys for the last active admin
  IF _effect = 'deny'
     AND _permission_key IN ('permissions.manage','users.manage_roles','users.update') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles ur
      WHERE ur.tenant_id = _tid AND ur.user_id = _target_user_id AND ur.role = 'admin'::app_role
    ) INTO _target_is_admin;

    IF _target_is_admin THEN
      SELECT COUNT(*) INTO _admin_count
      FROM public.user_roles ur
      JOIN public.tenant_users tu
        ON tu.tenant_id = ur.tenant_id
       AND tu.user_id = ur.user_id
      WHERE ur.tenant_id = _tid
        AND ur.role = 'admin'::app_role
        AND COALESCE(tu.is_active, false) = true;

      IF _admin_count <= 1 THEN
        RAISE EXCEPTION 'Cannot deny critical permission for the last active admin' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- Load prior state (for audit + preserve created_by)
  SELECT * INTO _existing
  FROM public.user_permission_overrides
  WHERE tenant_id = _tid AND user_id = _target_user_id AND permission_key = _permission_key;

  IF FOUND THEN
    _old := to_jsonb(_existing);
    UPDATE public.user_permission_overrides
       SET effect = _effect,
           reason = _reason,
           expires_at = _expires_at,
           updated_at = now()
     WHERE id = _existing.id
    RETURNING * INTO _new_row;
  ELSE
    _old := NULL;
    INSERT INTO public.user_permission_overrides
      (tenant_id, user_id, permission_key, effect, reason, expires_at, created_by)
    VALUES
      (_tid, _target_user_id, _permission_key, _effect, _reason, _expires_at, _actor)
    RETURNING * INTO _new_row;
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (tenant_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (_tid, _actor, 'user_permission_overrides', _new_row.id, 'permission_override_set',
          _old, to_jsonb(_new_row));

  RETURN jsonb_build_object(
    'success', true,
    'override', to_jsonb(_new_row),
    'effective_after', public.has_permission(_target_user_id, _permission_key)
  );
END;
$$;

-- =========================================================================
-- RPC: clear_user_permission_override
-- =========================================================================
CREATE OR REPLACE FUNCTION public.clear_user_permission_override(
  _target_user_id uuid,
  _permission_key text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := public.get_active_tenant_id();
  _actor uuid := auth.uid();
  _is_admin boolean;
  _is_manager boolean;
  _is_sensitive boolean;
  _existing public.user_permission_overrides%ROWTYPE;
  _target_active boolean;
  _admin_count int;
  _target_is_admin boolean;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'No active tenant' USING ERRCODE = '42501';
  END IF;

  _is_admin := public.has_role(_actor, 'admin'::app_role);
  _is_manager := public.has_role(_actor, 'manager'::app_role);
  IF NOT (_is_admin OR _is_manager) THEN
    RAISE EXCEPTION 'Insufficient privileges to manage permission overrides' USING ERRCODE = '42501';
  END IF;

  IF _actor = _target_user_id THEN
    RAISE EXCEPTION 'Cannot manage own permission overrides' USING ERRCODE = '42501';
  END IF;

  SELECT p.is_sensitive INTO _is_sensitive
  FROM public.permissions p WHERE p.key = _permission_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permission key does not exist: %', _permission_key USING ERRCODE = '22023';
  END IF;

  IF _is_sensitive AND NOT _is_admin THEN
    RAISE EXCEPTION 'Only admin can manage sensitive permission overrides' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(tu.is_active, false) INTO _target_active
  FROM public.tenant_users tu
  WHERE tu.tenant_id = _tid AND tu.user_id = _target_user_id;
  IF NOT COALESCE(_target_active, false) THEN
    RAISE EXCEPTION 'Target user is not active in this tenant' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _existing
  FROM public.user_permission_overrides
  WHERE tenant_id = _tid AND user_id = _target_user_id AND permission_key = _permission_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'cleared', false,
      'effective_after', public.has_permission(_target_user_id, _permission_key)
    );
  END IF;

  -- Last-admin critical guard: clearing an allow on a critical key for the last admin
  IF _existing.effect = 'allow'
     AND _permission_key IN ('permissions.manage','users.manage_roles','users.update') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles ur
      WHERE ur.tenant_id = _tid AND ur.user_id = _target_user_id AND ur.role = 'admin'::app_role
    ) INTO _target_is_admin;

    IF _target_is_admin THEN
      SELECT COUNT(*) INTO _admin_count
      FROM public.user_roles ur
      JOIN public.tenant_users tu
        ON tu.tenant_id = ur.tenant_id AND tu.user_id = ur.user_id
      WHERE ur.tenant_id = _tid AND ur.role = 'admin'::app_role
        AND COALESCE(tu.is_active, false) = true;

      IF _admin_count <= 1 THEN
        RAISE EXCEPTION 'Cannot clear critical allow for the last active admin' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  DELETE FROM public.user_permission_overrides WHERE id = _existing.id;

  INSERT INTO public.audit_logs (tenant_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (_tid, _actor, 'user_permission_overrides', _existing.id, 'permission_override_cleared',
          to_jsonb(_existing),
          jsonb_build_object('cleared', true, 'reason', _reason));

  RETURN jsonb_build_object(
    'success', true,
    'cleared', true,
    'effective_after', public.has_permission(_target_user_id, _permission_key)
  );
END;
$$;

-- Grants: block anon/PUBLIC, allow authenticated (internal role gate enforces admin/manager)
REVOKE EXECUTE ON FUNCTION public.set_user_permission_override(uuid, text, text, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_permission_override(uuid, text, text, text, timestamptz) FROM anon;
GRANT  EXECUTE ON FUNCTION public.set_user_permission_override(uuid, text, text, text, timestamptz) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.set_user_permission_override(uuid, text, text, text, timestamptz) TO service_role;

REVOKE EXECUTE ON FUNCTION public.clear_user_permission_override(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_user_permission_override(uuid, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.clear_user_permission_override(uuid, text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.clear_user_permission_override(uuid, text, text) TO service_role;
