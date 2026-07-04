-- Phase 3.2.1: harden EXECUTE grants on new permission functions
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_permission(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.has_any_permission(uuid, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_permission(uuid, text[]) FROM anon;
GRANT  EXECUTE ON FUNCTION public.has_any_permission(uuid, text[]) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_any_permission(uuid, text[]) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_permissions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_permissions() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_my_permissions() TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_effective_permissions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_effective_permissions(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_effective_permissions(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_effective_permissions(uuid) TO service_role;

-- Internal seed function: never callable by client roles.
-- Fires only via trigger trg_seed_role_permissions_new_tenant (SECURITY DEFINER preserves execution).
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() TO service_role;