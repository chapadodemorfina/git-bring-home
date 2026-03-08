
-- ══════════════════════════════════════════════════════════
-- AUDIT TRIGGERS ON ALL CRITICAL TABLES
-- ══════════════════════════════════════════════════════════

-- Service Orders
DROP TRIGGER IF EXISTS audit_service_orders_insert ON service_orders;
DROP TRIGGER IF EXISTS audit_service_orders_update ON service_orders;
DROP TRIGGER IF EXISTS audit_service_orders_delete ON service_orders;
CREATE TRIGGER audit_service_orders_insert AFTER INSERT ON service_orders FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');
CREATE TRIGGER audit_service_orders_update AFTER UPDATE ON service_orders FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');
CREATE TRIGGER audit_service_orders_delete AFTER DELETE ON service_orders FOR EACH ROW EXECUTE FUNCTION trg_audit_log('delete');

-- Repair Quotes
DROP TRIGGER IF EXISTS audit_repair_quotes_insert ON repair_quotes;
DROP TRIGGER IF EXISTS audit_repair_quotes_update ON repair_quotes;
DROP TRIGGER IF EXISTS audit_repair_quotes_delete ON repair_quotes;
CREATE TRIGGER audit_repair_quotes_insert AFTER INSERT ON repair_quotes FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');
CREATE TRIGGER audit_repair_quotes_update AFTER UPDATE ON repair_quotes FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');
CREATE TRIGGER audit_repair_quotes_delete AFTER DELETE ON repair_quotes FOR EACH ROW EXECUTE FUNCTION trg_audit_log('delete');

-- Financial Entries
DROP TRIGGER IF EXISTS audit_financial_entries_insert ON financial_entries;
DROP TRIGGER IF EXISTS audit_financial_entries_update ON financial_entries;
DROP TRIGGER IF EXISTS audit_financial_entries_delete ON financial_entries;
CREATE TRIGGER audit_financial_entries_insert AFTER INSERT ON financial_entries FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');
CREATE TRIGGER audit_financial_entries_update AFTER UPDATE ON financial_entries FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');
CREATE TRIGGER audit_financial_entries_delete AFTER DELETE ON financial_entries FOR EACH ROW EXECUTE FUNCTION trg_audit_log('delete');

-- Payments
DROP TRIGGER IF EXISTS audit_payments_insert ON payments;
DROP TRIGGER IF EXISTS audit_payments_update ON payments;
CREATE TRIGGER audit_payments_insert AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');
CREATE TRIGGER audit_payments_update AFTER UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');

-- Products (Inventory)
DROP TRIGGER IF EXISTS audit_products_update ON products;
CREATE TRIGGER audit_products_update AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');

-- Stock Movements
DROP TRIGGER IF EXISTS audit_stock_movements_insert ON stock_movements;
CREATE TRIGGER audit_stock_movements_insert AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');

-- Warranties
DROP TRIGGER IF EXISTS audit_warranties_insert ON warranties;
DROP TRIGGER IF EXISTS audit_warranties_update ON warranties;
CREATE TRIGGER audit_warranties_insert AFTER INSERT ON warranties FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');
CREATE TRIGGER audit_warranties_update AFTER UPDATE ON warranties FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');

-- Warranty Returns
DROP TRIGGER IF EXISTS audit_warranty_returns_insert ON warranty_returns;
CREATE TRIGGER audit_warranty_returns_insert AFTER INSERT ON warranty_returns FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');

-- Commission Payments
DROP TRIGGER IF EXISTS audit_commissions_insert ON collection_point_commissions;
DROP TRIGGER IF EXISTS audit_commissions_update ON collection_point_commissions;
CREATE TRIGGER audit_commissions_insert AFTER INSERT ON collection_point_commissions FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');
CREATE TRIGGER audit_commissions_update AFTER UPDATE ON collection_point_commissions FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');

-- Diagnostics
DROP TRIGGER IF EXISTS audit_diagnostics_update ON diagnostics;
CREATE TRIGGER audit_diagnostics_update AFTER UPDATE ON diagnostics FOR EACH ROW EXECUTE FUNCTION trg_audit_log('update');

-- Quote Approvals
DROP TRIGGER IF EXISTS audit_quote_approvals_insert ON quote_approvals;
CREATE TRIGGER audit_quote_approvals_insert AFTER INSERT ON quote_approvals FOR EACH ROW EXECUTE FUNCTION trg_audit_log('create');

-- ══════════════════════════════════════════════════════════
-- SUSPICIOUS ACTIVITY DETECTION
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _since timestamptz := now() - (_days || ' days')::interval;
BEGIN
  RETURN jsonb_build_object(
    -- Frequent inventory adjustments (>5 adjustments by same user in period)
    'frequent_stock_adjustments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', user_id, 'user_name', COALESCE(p.full_name, 'Desconhecido'), 'count', cnt
      )), '[]'::jsonb)
      FROM (
        SELECT al.user_id, COUNT(*) as cnt
        FROM audit_logs al
        WHERE al.table_name = 'stock_movements' AND al.action = 'create' AND al.created_at >= _since
        GROUP BY al.user_id HAVING COUNT(*) > 5
      ) sub
      LEFT JOIN profiles p ON p.id = sub.user_id
    ),

    -- Quote modifications after approval
    'quote_mods_after_approval', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'record_id', al.record_id, 'user_id', al.user_id, 'user_name', COALESCE(p.full_name, 'Desconhecido'),
        'action', al.action, 'created_at', al.created_at
      )), '[]'::jsonb)
      FROM audit_logs al
      LEFT JOIN profiles p ON p.id = al.user_id
      WHERE al.table_name = 'repair_quotes' AND al.action = 'update' AND al.created_at >= _since
        AND al.old_data->>'status' IN ('approved', 'rejected')
    ),

    -- Deleted service orders
    'deleted_service_orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'record_id', al.record_id, 'user_id', al.user_id, 'user_name', COALESCE(p.full_name, 'Desconhecido'),
        'old_data', al.old_data, 'created_at', al.created_at
      )), '[]'::jsonb)
      FROM audit_logs al
      LEFT JOIN profiles p ON p.id = al.user_id
      WHERE al.table_name = 'service_orders' AND al.action = 'delete' AND al.created_at >= _since
    ),

    -- Large financial modifications (>R$500 changed)
    'large_financial_changes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'record_id', al.record_id, 'user_id', al.user_id, 'user_name', COALESCE(p.full_name, 'Desconhecido'),
        'old_amount', al.old_data->>'amount', 'new_amount', al.new_data->>'amount', 'created_at', al.created_at
      )), '[]'::jsonb)
      FROM audit_logs al
      LEFT JOIN profiles p ON p.id = al.user_id
      WHERE al.table_name = 'financial_entries' AND al.action = 'update' AND al.created_at >= _since
        AND al.old_data->>'amount' IS NOT NULL AND al.new_data->>'amount' IS NOT NULL
        AND ABS(COALESCE((al.new_data->>'amount')::numeric, 0) - COALESCE((al.old_data->>'amount')::numeric, 0)) > 500
    ),

    -- Voided warranties
    'voided_warranties', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'record_id', al.record_id, 'user_id', al.user_id, 'user_name', COALESCE(p.full_name, 'Desconhecido'),
        'warranty_number', al.new_data->>'warranty_number', 'reason', al.new_data->>'reason', 'created_at', al.created_at
      )), '[]'::jsonb)
      FROM audit_logs al
      LEFT JOIN profiles p ON p.id = al.user_id
      WHERE al.action = 'warranty_voided' AND al.created_at >= _since
    ),

    -- Summary counts
    'summary', jsonb_build_object(
      'total_actions', (SELECT COUNT(*) FROM audit_logs WHERE created_at >= _since),
      'creates', (SELECT COUNT(*) FROM audit_logs WHERE action = 'create' AND created_at >= _since),
      'updates', (SELECT COUNT(*) FROM audit_logs WHERE action = 'update' AND created_at >= _since),
      'deletes', (SELECT COUNT(*) FROM audit_logs WHERE action = 'delete' AND created_at >= _since),
      'tables_affected', (SELECT COUNT(DISTINCT table_name) FROM audit_logs WHERE created_at >= _since)
    )
  );
END;
$$;

-- Prevent deletion of audit logs
CREATE OR REPLACE FUNCTION public.prevent_audit_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS no_delete_audit ON audit_logs;
CREATE TRIGGER no_delete_audit
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_delete();

-- Index for faster audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
