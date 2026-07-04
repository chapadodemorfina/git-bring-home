
-- Fase 3.5.9: criar sales.update e conceder aos roles atuais de ROUTE_ROLES.sales

-- 1) Catálogo
INSERT INTO public.permissions (key, module, action, description, is_sensitive, is_system)
VALUES ('sales.update', 'sales', 'update', 'Editar vendas', true, true)
ON CONFLICT (key) DO NOTHING;

-- 2) Conceder aos roles atuais de ROUTE_ROLES.sales em todos tenants
INSERT INTO public.role_permissions (tenant_id, role, permission_key, allowed)
SELECT t.id, r.role::app_role, 'sales.update', true
FROM public.tenants t
CROSS JOIN (VALUES ('admin'),('manager'),('front_desk')) AS r(role)
ON CONFLICT (tenant_id, role, permission_key)
DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = now();

-- 3) Atualizar função de seed para novos tenants
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
    'customers.view','sales.view','quotes.view','warranties.view',
    'commercial.view'
  ]) AS k
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_permissions (tenant_id, role, permission_key)
  SELECT NEW.id, 'front_desk'::app_role, k
  FROM unnest(ARRAY[
    'operation.view',
    'customers.view','customers.create','customers.update',
    'devices.view','devices.create','devices.update',
    'sales.view','sales.create','sales.update',
    'pdv.operate',
    'quotes.view','quotes.create','quotes.update',
    'warranties.view','warranties.create',
    'service_orders.view','service_orders.create','service_orders.update',
    'messaging.view','messaging.send',
    'cash_register.view','cash_register.open','cash_register.close','cash_register.movement',
    'inventory.view',
    'logistics.view','logistics.update',
    'commercial.view'
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
    'quotes.view','quotes.create','quotes.update',
    'warranties.view','warranties.create',
    'customers.view','customers.create','customers.update',
    'sales.view',
    'commercial.view'
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

REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() TO service_role;
