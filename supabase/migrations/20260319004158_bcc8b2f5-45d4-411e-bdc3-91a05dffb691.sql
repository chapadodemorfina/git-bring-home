
-- =============================================
-- MULTI-TENANT SECURITY: tenant_id on ALL business tables + RLS + RPCs
-- =============================================

-- SECTION 1: Default tenant + user assignment
INSERT INTO public.tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default', 'default')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.tenant_users (tenant_id, user_id, tenant_role, is_default, is_active)
SELECT '00000000-0000-0000-0000-000000000001', id, 'owner', true, true
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.tenant_users)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- SECTION 2: Trigger function for auto-setting tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL THEN
    NEW.tenant_id := public.get_active_tenant_id();
  END IF;
  IF NEW.tenant_id IS NULL THEN
    SELECT id INTO NEW.tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF NEW.tenant_id IS NULL THEN RAISE EXCEPTION 'No tenant available'; END IF;
  RETURN NEW;
END;
$$;

-- SECTION 3: Add tenant_id to ALL business tables
DO $$
DECLARE
  _tables TEXT[] := ARRAY[
    'customers', 'devices', 'service_orders', 'products', 'suppliers',
    'financial_entries', 'sales', 'cash_registers', 'collection_points',
    'repair_quotes', 'warranties', 'pickups_deliveries', 'inventory_scrap',
    'whatsapp_conversations', 'notification_rules', 'notification_templates',
    'sla_configs', 'commission_rules', 'user_roles',
    'customer_addresses', 'customer_contacts', 'customer_message_events',
    'device_accessories', 'device_photos', 'device_location_tracking',
    'service_order_attachments', 'service_order_checklists', 'service_order_public_links',
    'service_order_signatures', 'service_order_status_history', 'service_order_terms',
    'diagnostics', 'diagnosis_faults', 'diagnosis_parts', 'diagnosis_tests',
    'repair_quote_items', 'quote_approvals',
    'repair_parts_used', 'repair_services', 'repair_tests', 'repair_timer_sessions',
    'warranty_items', 'warranty_returns', 'warranty_rules',
    'payments', 'accounts_receivable', 'receivable_payments', 'purchase_entries',
    'stock_movements', 'part_reservations',
    'scrap_carcass_details', 'scrap_disassembly', 'scrap_parts_recovered', 'scrap_triage',
    'sale_items', 'sale_payments', 'sale_returns',
    'cash_register_movements',
    'collection_point_users', 'collection_point_commissions', 'collection_transfers',
    'commission_entries', 'transport_events',
    'notification_events', 'notification_logs', 'notification_queue',
    'audit_logs',
    'whatsapp_messages', 'whatsapp_handoffs', 'whatsapp_ai_actions', 'whatsapp_pending_states'
  ];
  _t TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _t AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id)', _t);
      EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', _t, '00000000-0000-0000-0000-000000000001');
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', _t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenant ON public.%I (tenant_id)', _t, _t);
    END IF;
  END LOOP;
END;
$$;

-- SECTION 4: Handle app_settings (composite PK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_settings' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
    ALTER TABLE public.app_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.app_settings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE public.app_settings ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.app_settings ADD PRIMARY KEY (tenant_id, key);
    CREATE INDEX IF NOT EXISTS idx_app_settings_tenant ON public.app_settings (tenant_id);
  END IF;
END;
$$;

-- SECTION 5: Fix user_roles unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_tenant_user_role_key') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_tenant_user_role_key UNIQUE (tenant_id, user_id, role);
  END IF;
END;
$$;

-- SECTION 6: Apply auto-set triggers
DO $$
DECLARE
  _tables TEXT[] := ARRAY[
    'customers', 'devices', 'service_orders', 'products', 'suppliers',
    'financial_entries', 'sales', 'cash_registers', 'collection_points',
    'repair_quotes', 'warranties', 'pickups_deliveries', 'inventory_scrap',
    'whatsapp_conversations', 'notification_rules', 'notification_templates',
    'sla_configs', 'commission_rules', 'user_roles', 'app_settings',
    'customer_addresses', 'customer_contacts', 'customer_message_events',
    'device_accessories', 'device_photos', 'device_location_tracking',
    'service_order_attachments', 'service_order_checklists', 'service_order_public_links',
    'service_order_signatures', 'service_order_status_history', 'service_order_terms',
    'diagnostics', 'diagnosis_faults', 'diagnosis_parts', 'diagnosis_tests',
    'repair_quote_items', 'quote_approvals',
    'repair_parts_used', 'repair_services', 'repair_tests', 'repair_timer_sessions',
    'warranty_items', 'warranty_returns', 'warranty_rules',
    'payments', 'accounts_receivable', 'receivable_payments', 'purchase_entries',
    'stock_movements', 'part_reservations',
    'scrap_carcass_details', 'scrap_disassembly', 'scrap_parts_recovered', 'scrap_triage',
    'sale_items', 'sale_payments', 'sale_returns',
    'cash_register_movements',
    'collection_point_users', 'collection_point_commissions', 'collection_transfers',
    'commission_entries', 'transport_events',
    'notification_events', 'notification_logs', 'notification_queue',
    'audit_logs',
    'whatsapp_messages', 'whatsapp_handoffs', 'whatsapp_ai_actions', 'whatsapp_pending_states'
  ];
  _t TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_set_tenant_%s BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert()',
      _t, _t
    );
  END LOOP;
END;
$$;

-- SECTION 7: Add RESTRICTIVE tenant isolation policies
DO $$
DECLARE
  _tables TEXT[] := ARRAY[
    'customers', 'devices', 'service_orders', 'products', 'suppliers',
    'financial_entries', 'sales', 'cash_registers', 'collection_points',
    'repair_quotes', 'warranties', 'pickups_deliveries', 'inventory_scrap',
    'whatsapp_conversations', 'notification_rules', 'notification_templates',
    'sla_configs', 'commission_rules', 'user_roles', 'app_settings',
    'customer_addresses', 'customer_contacts', 'customer_message_events',
    'device_accessories', 'device_photos', 'device_location_tracking',
    'service_order_attachments', 'service_order_checklists', 'service_order_public_links',
    'service_order_signatures', 'service_order_status_history', 'service_order_terms',
    'diagnostics', 'diagnosis_faults', 'diagnosis_parts', 'diagnosis_tests',
    'repair_quote_items', 'quote_approvals',
    'repair_parts_used', 'repair_services', 'repair_tests', 'repair_timer_sessions',
    'warranty_items', 'warranty_returns', 'warranty_rules',
    'payments', 'accounts_receivable', 'receivable_payments', 'purchase_entries',
    'stock_movements', 'part_reservations',
    'scrap_carcass_details', 'scrap_disassembly', 'scrap_parts_recovered', 'scrap_triage',
    'sale_items', 'sale_payments', 'sale_returns',
    'cash_register_movements',
    'collection_point_users', 'collection_point_commissions', 'collection_transfers',
    'commission_entries', 'transport_events',
    'notification_events', 'notification_logs', 'notification_queue',
    'audit_logs',
    'whatsapp_messages', 'whatsapp_handoffs', 'whatsapp_ai_actions', 'whatsapp_pending_states'
  ];
  _t TEXT;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_%s" ON public.%I', _t, _t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation_%s" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.get_active_tenant_id()) WITH CHECK (tenant_id = public.get_active_tenant_id())',
      _t, _t
    );
  END LOOP;
END;
$$;

-- SECTION 8: Update role functions to be tenant-aware
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND tenant_id = public.get_active_tenant_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles) AND tenant_id = public.get_active_tenant_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id AND tenant_id = public.get_active_tenant_id()
$$;

-- SECTION 9: Update critical RPCs with tenant filtering

CREATE OR REPLACE FUNCTION public.dashboard_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _result jsonb; _tid uuid := public.get_active_tenant_id();
  _today_start timestamptz := date_trunc('day', now()); _today_end timestamptz := _today_start + interval '1 day';
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  SELECT jsonb_build_object(
    'total_orders', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'open_orders', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND status NOT IN ('delivered','cancelled')),
    'orders_by_status', (SELECT COALESCE(jsonb_object_agg(status::text,cnt),'{}'::jsonb) FROM (SELECT status,COUNT(*) as cnt FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to GROUP BY status) s),
    'total_revenue', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_expenses', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='expense' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_customers', (SELECT COUNT(*) FROM customers WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'total_devices', (SELECT COUNT(*) FROM devices WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to),
    'today_orders', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _today_start AND _today_end),
    'today_revenue', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _today_start AND _today_end),
    'avg_repair_time_hours', (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (CASE WHEN status='delivered' THEN updated_at ELSE now() END)-created_at)/3600)::numeric,1),0) FROM service_orders WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to AND status NOT IN ('cancelled')),
    'pending_quotes', (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND status='sent'),
    'overdue_entries', (SELECT COUNT(*) FROM financial_entries WHERE tenant_id=_tid AND status='overdue')
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_service_order_status(_order_id uuid, _from_status text, _to_status text, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  UPDATE service_orders SET status=_to_status::service_order_status, updated_at=now() WHERE id=_order_id AND tenant_id=_tid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or access denied'; END IF;
  INSERT INTO service_order_status_history (service_order_id,from_status,to_status,notes,changed_by,tenant_id)
  VALUES (_order_id, CASE WHEN _from_status IS NOT NULL THEN _from_status::service_order_status ELSE NULL END, _to_status::service_order_status, _notes, auth.uid(), _tid);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_part(_service_order_id uuid, _product_id uuid, _quantity integer, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _product products%ROWTYPE; _user_id uuid; _new_qty integer; _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  _user_id := auth.uid();
  SELECT * INTO _product FROM products WHERE id=_product_id AND tenant_id=_tid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  IF _product.quantity < _quantity THEN RAISE EXCEPTION 'Estoque insuficiente: disponível %, solicitado %', _product.quantity, _quantity; END IF;
  IF NOT EXISTS (SELECT 1 FROM service_orders WHERE id=_service_order_id AND tenant_id=_tid) THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  _new_qty := _product.quantity - _quantity;
  UPDATE products SET quantity=_new_qty WHERE id=_product_id AND tenant_id=_tid;
  INSERT INTO stock_movements (product_id,movement_type,quantity,previous_quantity,new_quantity,unit_cost,reference_type,reference_id,notes,created_by,tenant_id) VALUES (_product_id,'consumed',-_quantity,_product.quantity,_new_qty,_product.cost_price,'service_order',_service_order_id,_notes,_user_id,_tid);
  INSERT INTO repair_parts_used (service_order_id,product_id,quantity,unit_cost,unit_price,total_cost,total_price,notes,consumed_by,tenant_id) VALUES (_service_order_id,_product_id,_quantity,_product.cost_price,_product.sale_price,_product.cost_price*_quantity,_product.sale_price*_quantity,_notes,_user_id,_tid);
  RETURN jsonb_build_object('success',true,'new_quantity',_new_qty);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_stock(_product_id uuid, _new_quantity integer, _reason text DEFAULT 'Ajuste manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _product products%ROWTYPE; _user_id uuid; _diff integer; _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  _user_id := auth.uid();
  SELECT * INTO _product FROM products WHERE id=_product_id AND tenant_id=_tid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  _diff := _new_quantity - _product.quantity;
  UPDATE products SET quantity=_new_quantity WHERE id=_product_id AND tenant_id=_tid;
  INSERT INTO stock_movements (product_id,movement_type,quantity,previous_quantity,new_quantity,notes,created_by,tenant_id) VALUES (_product_id,'adjustment',_diff,_product.quantity,_new_quantity,_reason,_user_id,_tid);
  RETURN jsonb_build_object('success',true,'previous',_product.quantity,'new',_new_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _result jsonb; _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  SELECT jsonb_build_object(
    'total_revenue', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_expenses', (SELECT COALESCE(SUM(amount),0) FROM financial_entries WHERE tenant_id=_tid AND entry_type='expense' AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_paid', (SELECT COALESCE(SUM(paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'total_pending', (SELECT COALESCE(SUM(amount-paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND status IN ('pending','partial','overdue') AND created_at BETWEEN _from AND _to),
    'total_overdue', (SELECT COALESCE(SUM(amount-paid_amount),0) FROM financial_entries WHERE tenant_id=_tid AND status='overdue' AND created_at BETWEEN _from AND _to),
    'count_entries', (SELECT COUNT(*) FROM financial_entries WHERE tenant_id=_tid AND status<>'cancelled' AND created_at BETWEEN _from AND _to),
    'count_overdue', (SELECT COUNT(*) FROM financial_entries WHERE tenant_id=_tid AND status='overdue'),
    'by_category', (SELECT COALESCE(jsonb_object_agg(COALESCE(category,'Sem categoria'),total),'{}'::jsonb) FROM (SELECT category,SUM(amount) as total FROM financial_entries WHERE tenant_id=_tid AND entry_type='revenue' AND status<>'cancelled' AND created_at BETWEEN _from AND _to GROUP BY category) c),
    'by_payment_method', (SELECT COALESCE(jsonb_object_agg(COALESCE(p.payment_method,'N/A'),p.total),'{}'::jsonb) FROM (SELECT payment_method,SUM(amount) as total FROM payments WHERE tenant_id=_tid AND created_at BETWEEN _from AND _to GROUP BY payment_method) p)
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_work_queues()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _result jsonb; _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  SELECT jsonb_build_object(
    'awaiting_diagnosis', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND status='in_diagnosis'),
    'awaiting_approval', (SELECT COUNT(*) FROM repair_quotes WHERE tenant_id=_tid AND status='sent'),
    'awaiting_parts', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND status='waiting_parts'),
    'in_repair', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND status='repairing'),
    'ready_for_pickup', (SELECT COUNT(*) FROM service_orders WHERE tenant_id=_tid AND status='ready_for_pickup'),
    'overdue_financials', (SELECT COUNT(*) FROM financial_entries WHERE tenant_id=_tid AND status='overdue'),
    'low_stock', (SELECT COUNT(*) FROM products WHERE tenant_id=_tid AND quantity<=min_quantity AND is_active=true),
    'pending_logistics', (SELECT COUNT(*) FROM pickups_deliveries WHERE tenant_id=_tid AND status IN ('scheduled','in_transit'))
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_payment(_entry_id uuid, _amount numeric, _method text, _notes text DEFAULT NULL, _reference text DEFAULT NULL, _installment_number integer DEFAULT NULL, _total_installments integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE _entry financial_entries%ROWTYPE; _new_paid numeric; _new_status financial_entry_status; _tid uuid := public.get_active_tenant_id();
BEGIN
  IF _tid IS NULL THEN RAISE EXCEPTION 'Tenant not set'; END IF;
  SELECT * INTO _entry FROM financial_entries WHERE id=_entry_id AND tenant_id=_tid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada financeira não encontrada'; END IF;
  _new_paid := _entry.paid_amount + _amount;
  IF _new_paid >= _entry.amount THEN _new_status := 'paid'; ELSE _new_status := 'partial'; END IF;
  UPDATE financial_entries SET paid_amount=_new_paid, status=_new_status, updated_at=now() WHERE id=_entry_id AND tenant_id=_tid;
  INSERT INTO payments (financial_entry_id,amount,payment_method,notes,reference,installment_number,total_installments,created_by,tenant_id) VALUES (_entry_id,_amount,_method,_notes,_reference,_installment_number,_total_installments,auth.uid(),_tid);
  RETURN jsonb_build_object('success',true,'new_paid',_new_paid,'new_status',_new_status);
END;
$$;
