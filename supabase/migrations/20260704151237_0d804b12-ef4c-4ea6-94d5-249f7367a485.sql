
-- PARTE 1A: Adicionar permissões faltantes ao bench_technician em todos os tenants
INSERT INTO public.role_permissions (tenant_id, role, permission_key, allowed)
SELECT t.id, 'bench_technician'::app_role, p.key, true
FROM public.tenants t
CROSS JOIN public.permissions p
WHERE p.key IN (
  'quotes.view','quotes.create',
  'warranties.view','warranties.create',
  'customers.view','customers.create','customers.update',
  'devices.create',
  'sales.view',
  'inventory.adjust','inventory.scrap'
)
ON CONFLICT (tenant_id, role, permission_key)
DO UPDATE SET allowed = true, updated_at = now();

-- PARTE 1B: Remover permissões excedentes de finance
DELETE FROM public.role_permissions
WHERE role = 'finance'::app_role
  AND permission_key IN ('settings.view','cash_register.view');

-- PARTE 2: Atualizar seed para novos tenants
CREATE OR REPLACE FUNCTION public.seed_role_permissions_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'admin'::app_role, key FROM public.permissions
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'manager'::app_role, key FROM public.permissions
  WHERE key NOT IN ('users.manage_roles','permissions.manage')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'finance'::app_role, k
  FROM unnest(ARRAY[
    'dashboard.view',
    'financial.view','financial.create','financial.update','financial.delete','financial.export',
    'receivables.view','receivables.pay',
    'commissions.view','commissions.pay','commissions.update_status',
    'reports.view','reports.export',
    'customers.view','sales.view','quotes.view','warranties.view'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'front_desk'::app_role, k
  FROM unnest(ARRAY[
    'operation.view',
    'customers.view','customers.create','customers.update',
    'devices.view','devices.create','devices.update',
    'sales.view','sales.create',
    'pdv.operate',
    'quotes.view','quotes.create',
    'warranties.view','warranties.create',
    'service_orders.view','service_orders.create','service_orders.update',
    'messaging.view','messaging.send',
    'cash_register.view','cash_register.open','cash_register.close','cash_register.movement',
    'inventory.view',
    'logistics.view','logistics.update'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'bench_technician'::app_role, k
  FROM unnest(ARRAY[
    'tech.view','operation.view',
    'service_orders.view','service_orders.update','service_orders.close',
    'devices.view','devices.update','devices.create',
    'inventory.view','inventory.adjust','inventory.scrap',
    'logistics.view','logistics.update',
    'quotes.view','quotes.create',
    'warranties.view','warranties.create',
    'customers.view','customers.create','customers.update',
    'sales.view'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'field_technician'::app_role, k
  FROM unnest(ARRAY[
    'tech.view','operation.view',
    'service_orders.view','service_orders.update','service_orders.close'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  VALUES
    (NEW.id, 'collection_point_operator'::app_role, 'partner.view'),
    (NEW.id, 'customer'::app_role, 'portal.view')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Preservar grants seguros (Fase 3.2.1)
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() TO service_role;
