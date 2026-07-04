
-- =========================================================================
-- FASE 3.1/3.2 — Fundação read-only de permissões configuráveis
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1) TABLE: permissions (catálogo global)
-- -------------------------------------------------------------------------
CREATE TABLE public.permissions (
  key         text PRIMARY KEY,
  module      text NOT NULL,
  action      text NOT NULL,
  description text,
  is_sensitive boolean NOT NULL DEFAULT false,
  is_system    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_key_format CHECK (key = module || '.' || action),
  CONSTRAINT permissions_module_snake CHECK (module ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT permissions_action_snake CHECK (action ~ '^[a-z][a-z0-9_]*$')
);

GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL    ON public.permissions TO service_role;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY permissions_select_authenticated
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- 2) TABLE: role_permissions (por tenant)
-- -------------------------------------------------------------------------
CREATE TABLE public.role_permissions (
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role           app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, role, permission_key)
);

CREATE INDEX idx_role_permissions_tenant_role
  ON public.role_permissions (tenant_id, role);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL    ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Tenant boundary (RESTRICTIVE) — aplica a qualquer comando
CREATE POLICY role_permissions_tenant_isolation
  ON public.role_permissions AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

-- SELECT PERMISSIVE só para admin/manager (leitura administrativa futura)
CREATE POLICY role_permissions_select_admin_manager
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- Nenhuma policy PERMISSIVE de INSERT/UPDATE/DELETE — escrita só via service_role.

-- -------------------------------------------------------------------------
-- 3) TABLE: user_permission_overrides
-- -------------------------------------------------------------------------
CREATE TABLE public.user_permission_overrides (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  effect         text NOT NULL CHECK (effect IN ('allow','deny')),
  reason         text,
  expires_at     timestamptz NULL,
  created_by     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, permission_key)
);

CREATE INDEX idx_upo_tenant_user
  ON public.user_permission_overrides (tenant_id, user_id);

GRANT SELECT ON public.user_permission_overrides TO authenticated;
GRANT ALL    ON public.user_permission_overrides TO service_role;

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY upo_tenant_isolation
  ON public.user_permission_overrides AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

CREATE POLICY upo_select_admin_manager
  ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]));

-- -------------------------------------------------------------------------
-- 4) updated_at triggers
-- -------------------------------------------------------------------------
CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_permission_overrides_updated_at
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- 5) SEED: catálogo de permissões
-- -------------------------------------------------------------------------
INSERT INTO public.permissions (key, module, action, description, is_sensitive) VALUES
  ('dashboard.view',              'dashboard',        'view',           'Ver dashboard executivo',                     false),
  ('operation.view',              'operation',        'view',           'Ver hub de operação',                          false),
  ('service_orders.view',         'service_orders',   'view',           'Ver ordens de serviço',                        false),
  ('service_orders.create',       'service_orders',   'create',         'Criar ordens de serviço',                      false),
  ('service_orders.update',       'service_orders',   'update',         'Editar ordens de serviço',                     false),
  ('service_orders.assign',       'service_orders',   'assign',         'Atribuir OS a técnico',                        false),
  ('service_orders.close',        'service_orders',   'close',          'Finalizar ordens de serviço',                  false),
  ('sales.view',                  'sales',            'view',           'Ver vendas',                                   false),
  ('sales.create',                'sales',            'create',         'Criar vendas',                                 false),
  ('sales.cancel',                'sales',            'cancel',         'Cancelar vendas',                              true),
  ('sales.return',                'sales',            'return',         'Registrar devolução de venda',                 true),
  ('pdv.operate',                 'pdv',              'operate',        'Operar o PDV',                                 false),
  ('quotes.view',                 'quotes',           'view',           'Ver orçamentos',                               false),
  ('quotes.create',               'quotes',           'create',         'Criar orçamentos',                             false),
  ('quotes.approve',              'quotes',           'approve',        'Aprovar orçamentos',                           false),
  ('warranties.view',             'warranties',       'view',           'Ver garantias',                                false),
  ('warranties.create',           'warranties',       'create',         'Criar garantias',                              false),
  ('warranties.void',             'warranties',       'void',           'Anular garantia',                              true),
  ('customers.view',              'customers',        'view',           'Ver clientes',                                 false),
  ('customers.create',            'customers',        'create',         'Criar clientes',                               false),
  ('customers.update',            'customers',        'update',         'Editar clientes',                              false),
  ('customers.delete',            'customers',        'delete',         'Remover clientes',                             true),
  ('devices.view',                'devices',          'view',           'Ver dispositivos',                             false),
  ('devices.create',              'devices',          'create',         'Cadastrar dispositivos',                       false),
  ('devices.update',              'devices',          'update',         'Editar dispositivos',                          false),
  ('inventory.view',              'inventory',        'view',           'Ver estoque',                                  false),
  ('inventory.adjust',            'inventory',        'adjust',         'Ajustar estoque',                              true),
  ('inventory.scrap',             'inventory',        'scrap',          'Registrar sucata',                             true),
  ('inventory.transfer',          'inventory',        'transfer',       'Transferir estoque',                           false),
  ('logistics.view',              'logistics',        'view',           'Ver logística',                                false),
  ('logistics.update',            'logistics',        'update',         'Atualizar coletas/entregas',                   false),
  ('financial.view',              'financial',        'view',           'Ver financeiro',                               true),
  ('financial.create',            'financial',        'create',         'Criar lançamento financeiro',                  true),
  ('financial.update',            'financial',        'update',         'Editar lançamento financeiro',                 true),
  ('financial.delete',            'financial',        'delete',         'Excluir lançamento financeiro',                true),
  ('financial.export',            'financial',        'export',         'Exportar relatórios financeiros',              true),
  ('receivables.view',            'receivables',      'view',           'Ver contas a receber',                         false),
  ('receivables.pay',             'receivables',      'pay',            'Baixar/pagar contas a receber',                true),
  ('cash_register.view',          'cash_register',    'view',           'Ver caixa',                                    false),
  ('cash_register.open',          'cash_register',    'open',           'Abrir caixa',                                  false),
  ('cash_register.close',         'cash_register',    'close',          'Fechar caixa',                                 true),
  ('cash_register.movement',      'cash_register',    'movement',       'Registrar movimento de caixa',                 true),
  ('commissions.view',            'commissions',      'view',           'Ver comissões',                                false),
  ('commissions.generate',        'commissions',      'generate',       'Gerar comissões',                              false),
  ('commissions.approve',         'commissions',      'approve',        'Aprovar comissões',                            true),
  ('commissions.pay',             'commissions',      'pay',            'Pagar comissões',                              true),
  ('commissions.reverse',         'commissions',      'reverse',        'Reverter comissões',                           true),
  ('commissions.update_status',   'commissions',      'update_status',  'Alterar status de comissões',                  true),
  ('collection_points.view',      'collection_points','view',           'Ver pontos de coleta',                         false),
  ('collection_points.manage',    'collection_points','manage',         'Gerenciar pontos de coleta',                   false),
  ('reports.view',                'reports',          'view',           'Ver relatórios',                               false),
  ('reports.export',              'reports',          'export',         'Exportar relatórios',                          true),
  ('users.view',                  'users',            'view',           'Ver usuários',                                 true),
  ('users.create',                'users',            'create',         'Criar usuários',                               true),
  ('users.update',                'users',            'update',         'Editar usuários',                              true),
  ('users.manage_roles',          'users',            'manage_roles',   'Gerenciar papéis de usuários',                 true),
  ('users.deactivate',            'users',            'deactivate',     'Ativar/desativar usuários',                    true),
  ('permissions.view',            'permissions',      'view',           'Ver permissões',                               true),
  ('permissions.manage',          'permissions',      'manage',         'Gerenciar permissões',                         true),
  ('settings.view',               'settings',         'view',           'Ver configurações',                            false),
  ('settings.manage',             'settings',         'manage',         'Alterar configurações',                        true),
  ('audit.view',                  'audit',            'view',           'Ver logs de auditoria',                        true),
  ('messaging.view',              'messaging',        'view',           'Ver mensageria',                               false),
  ('messaging.send',              'messaging',        'send',           'Enviar mensagens',                             false),
  ('messaging.manage',            'messaging',        'manage',         'Gerenciar templates/regras de mensageria',     false),
  ('portal.view',                 'portal',           'view',           'Acessar portal do cliente',                    false),
  ('partner.view',                'partner',          'view',           'Acessar portal do parceiro',                   false),
  ('tech.view',                   'tech',             'view',           'Acessar portal técnico',                       false);

-- -------------------------------------------------------------------------
-- 6) SEED: role_permissions para tenants existentes
-- -------------------------------------------------------------------------

-- admin: todas
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'admin'::app_role, p.key
FROM public.tenants t CROSS JOIN public.permissions p
ON CONFLICT DO NOTHING;

-- manager: todas exceto users.manage_roles e permissions.manage
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'manager'::app_role, p.key
FROM public.tenants t CROSS JOIN public.permissions p
WHERE p.key NOT IN ('users.manage_roles','permissions.manage')
ON CONFLICT DO NOTHING;

-- finance
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'finance'::app_role, k
FROM public.tenants t
CROSS JOIN unnest(ARRAY[
  'dashboard.view',
  'financial.view','financial.create','financial.update','financial.delete','financial.export',
  'receivables.view','receivables.pay',
  'cash_register.view',
  'commissions.view','commissions.pay','commissions.update_status',
  'reports.view','reports.export',
  'customers.view','sales.view','quotes.view','warranties.view',
  'settings.view'
]) AS k
ON CONFLICT DO NOTHING;

-- front_desk
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'front_desk'::app_role, k
FROM public.tenants t
CROSS JOIN unnest(ARRAY[
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

-- bench_technician
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'bench_technician'::app_role, k
FROM public.tenants t
CROSS JOIN unnest(ARRAY[
  'tech.view',
  'operation.view',
  'service_orders.view','service_orders.update','service_orders.close',
  'devices.view','devices.update',
  'inventory.view',
  'logistics.view','logistics.update'
]) AS k
ON CONFLICT DO NOTHING;

-- field_technician
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'field_technician'::app_role, k
FROM public.tenants t
CROSS JOIN unnest(ARRAY[
  'tech.view',
  'operation.view',
  'service_orders.view','service_orders.update','service_orders.close'
]) AS k
ON CONFLICT DO NOTHING;

-- collection_point_operator
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'collection_point_operator'::app_role, 'partner.view'
FROM public.tenants t
ON CONFLICT DO NOTHING;

-- customer
INSERT INTO public.role_permissions (tenant_id, role, permission_key)
SELECT t.id, 'customer'::app_role, 'portal.view'
FROM public.tenants t
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------
-- 7) Trigger de seed para novos tenants
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_role_permissions_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    'cash_register.view',
    'commissions.view','commissions.pay','commissions.update_status',
    'reports.view','reports.export',
    'customers.view','sales.view','quotes.view','warranties.view',
    'settings.view'
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
    'devices.view','devices.update',
    'inventory.view',
    'logistics.view','logistics.update'
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
$$;

CREATE TRIGGER trg_seed_role_permissions_new_tenant
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_role_permissions_for_tenant();

-- -------------------------------------------------------------------------
-- 8) FUNCTION: has_permission
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant   uuid;
  v_effect   text;
  v_expires  timestamptz;
  v_perm_ok  boolean;
  v_granted  boolean;
BEGIN
  IF _user_id IS NULL OR _permission IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    v_tenant := public.get_active_tenant_id();
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF v_tenant IS NULL THEN
    RETURN false;
  END IF;

  SELECT true INTO v_perm_ok FROM public.permissions WHERE key = _permission;
  IF NOT COALESCE(v_perm_ok, false) THEN
    RETURN false;
  END IF;

  -- Override tem precedência (deny vence allow implicitamente pois há UNIQUE por chave)
  SELECT effect, expires_at
    INTO v_effect, v_expires
  FROM public.user_permission_overrides
  WHERE tenant_id = v_tenant
    AND user_id = _user_id
    AND permission_key = _permission;

  IF v_effect IS NOT NULL AND (v_expires IS NULL OR v_expires > now()) THEN
    RETURN v_effect = 'allow';
  END IF;

  -- Fallback: permissão via role no tenant ativo
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp
      ON rp.role = ur.role
     AND rp.tenant_id = v_tenant
     AND rp.permission_key = _permission
     AND rp.allowed = true
    WHERE ur.user_id = _user_id
      AND ur.tenant_id = v_tenant
  ) INTO v_granted;

  RETURN COALESCE(v_granted, false);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

-- -------------------------------------------------------------------------
-- 9) FUNCTION: has_any_permission
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_any_permission(_user_id uuid, _permissions text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT bool_or(public.has_permission(_user_id, p))
     FROM unnest(_permissions) AS p),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_any_permission(uuid, text[]) TO authenticated;

-- -------------------------------------------------------------------------
-- 10) FUNCTION: get_my_permissions
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_tenant uuid;
  v_result text[];
BEGIN
  IF v_user IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  BEGIN
    v_tenant := public.get_active_tenant_id();
  EXCEPTION WHEN OTHERS THEN
    RETURN ARRAY[]::text[];
  END;

  IF v_tenant IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  WITH role_grants AS (
    SELECT DISTINCT rp.permission_key AS key
    FROM public.user_roles ur
    JOIN public.role_permissions rp
      ON rp.role = ur.role
     AND rp.tenant_id = ur.tenant_id
     AND rp.allowed = true
    WHERE ur.user_id = v_user
      AND ur.tenant_id = v_tenant
  ),
  active_overrides AS (
    SELECT permission_key AS key, effect
    FROM public.user_permission_overrides
    WHERE tenant_id = v_tenant
      AND user_id = v_user
      AND (expires_at IS NULL OR expires_at > now())
  ),
  candidates AS (
    SELECT key FROM role_grants
    UNION
    SELECT key FROM active_overrides WHERE effect = 'allow'
  ),
  effective AS (
    SELECT c.key
    FROM candidates c
    WHERE EXISTS (SELECT 1 FROM public.permissions p WHERE p.key = c.key)
      AND NOT EXISTS (
        SELECT 1 FROM active_overrides o
        WHERE o.key = c.key AND o.effect = 'deny'
      )
  )
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
    INTO v_result
  FROM effective;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN ARRAY[]::text[];
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

-- -------------------------------------------------------------------------
-- 11) FUNCTION: get_effective_permissions(_target_user_id)
--     Retorno detalhado para futuro painel administrativo.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  -- Piso duro: admin ou manager (roles). Painel de permissões ainda não existe.
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','manager']::app_role[]) THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  v_tenant := public.get_active_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'no active tenant' USING ERRCODE = '42501';
  END IF;

  WITH role_grants AS (
    SELECT rp.permission_key AS key,
           array_agg(DISTINCT ur.role::text ORDER BY ur.role::text) AS via_roles
    FROM public.user_roles ur
    JOIN public.role_permissions rp
      ON rp.role = ur.role
     AND rp.tenant_id = ur.tenant_id
     AND rp.allowed = true
    WHERE ur.user_id = _target_user_id
      AND ur.tenant_id = v_tenant
    GROUP BY rp.permission_key
  ),
  ov AS (
    SELECT permission_key AS key, effect, expires_at, reason
    FROM public.user_permission_overrides
    WHERE tenant_id = v_tenant AND user_id = _target_user_id
  ),
  merged AS (
    SELECT
      p.key,
      p.module,
      p.action,
      p.description,
      p.is_sensitive,
      COALESCE(rg.via_roles, ARRAY[]::text[]) AS via_roles,
      (rg.key IS NOT NULL) AS from_role,
      ov.effect            AS override_effect,
      ov.expires_at        AS override_expires_at,
      ov.reason            AS override_reason,
      (ov.effect IS NOT NULL AND (ov.expires_at IS NULL OR ov.expires_at > now())) AS override_active,
      CASE
        WHEN ov.effect IS NOT NULL
             AND (ov.expires_at IS NULL OR ov.expires_at > now())
          THEN (ov.effect = 'allow')
        ELSE (rg.key IS NOT NULL)
      END AS effective
    FROM public.permissions p
    LEFT JOIN role_grants rg ON rg.key = p.key
    LEFT JOIN ov            ON ov.key = p.key
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'key', m.key,
        'module', m.module,
        'action', m.action,
        'description', m.description,
        'is_sensitive', m.is_sensitive,
        'via_roles', to_jsonb(m.via_roles),
        'from_role', m.from_role,
        'override_effect', m.override_effect,
        'override_expires_at', m.override_expires_at,
        'override_reason', m.override_reason,
        'override_active', m.override_active,
        'effective', m.effective
      )
      ORDER BY m.key
    ),
    '[]'::jsonb
  )
    INTO v_result
  FROM merged m;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_permissions(uuid) TO authenticated;
