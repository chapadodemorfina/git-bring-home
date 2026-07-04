-- Fase 3.5.7: criar permissão commercial.view e propagar seed
INSERT INTO public.permissions (key, module, action, description, is_sensitive, is_system)
VALUES ('commercial.view', 'commercial', 'view', 'Acessar hub comercial', false, true)
ON CONFLICT (key) DO NOTHING;

-- Conceder commercial.view aos roles que já acessam ROUTE_ROLES.commercial em todos os tenants existentes.
-- admin/manager já recebem todas as chaves via seed, mas garantimos idempotentemente.
INSERT INTO public.role_permissions (tenant_id, role, permission_key, allowed)
SELECT t.id, r.role::app_role, 'commercial.view', true
FROM public.tenants t
CROSS JOIN (VALUES ('admin'), ('manager'), ('front_desk'), ('finance'), ('bench_technician')) AS r(role)
ON CONFLICT (tenant_id, role, permission_key)
DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = now();

-- Atualizar seed_role_permissions_for_tenant() para novos tenants.
-- admin e manager continuam recebendo todas as chaves via os dois primeiros INSERTs (que iteram public.permissions).
-- Precisamos adicionar 'commercial.view' às listas explícitas de finance, front_desk e bench_technician.
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
    'sales.view','sales.create',
    'pdv.operate',
    'quotes.view','quotes.create',
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
    'quotes.view','quotes.create',
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

-- Preservar grants seguros (não permitir EXECUTE para anon/authenticated/PUBLIC)
REVOKE ALL ON FUNCTION public.seed_role_permissions_for_tenant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_role_permissions_for_tenant() FROM anon;
REVOKE ALL ON FUNCTION public.seed_role_permissions_for_tenant() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() TO service_role;