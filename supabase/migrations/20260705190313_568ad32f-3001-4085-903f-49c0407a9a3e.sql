
-- Fase 3.5.12.1 — Criar permissão sales.payment
INSERT INTO public.permissions (key, module, action, description, is_sensitive, is_system)
VALUES ('sales.payment','sales','payment','Registrar pagamento de venda',true,true)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  is_sensitive = EXCLUDED.is_sensitive,
  is_system = EXCLUDED.is_system;

-- Backfill em tenants existentes: admin, manager, front_desk
INSERT INTO public.role_permissions (tenant_id, role, permission_key, allowed)
SELECT t.id, r.role::app_role, 'sales.payment', true
FROM public.tenants t
CROSS JOIN (VALUES ('admin'),('manager'),('front_desk')) AS r(role)
ON CONFLICT (tenant_id, role, permission_key)
DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = now();

-- Atualizar seed function para novos tenants (front_desk explícito).
-- admin e manager já recebem todas as permissões via loop existente.
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
    'sales.view','sales.create','sales.update','sales.payment',
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

-- Preservar grants seguros (fail-safe explícito)
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.seed_role_permissions_for_tenant() TO service_role;
