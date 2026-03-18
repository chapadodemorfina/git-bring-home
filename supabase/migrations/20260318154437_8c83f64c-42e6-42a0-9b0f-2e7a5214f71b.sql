
-- Disable protective triggers temporarily
ALTER TABLE stock_movements DISABLE TRIGGER trg_prevent_stock_movement_delete;
ALTER TABLE audit_logs DISABLE TRIGGER no_delete_audit;

-- Now clean remaining data
DELETE FROM stock_movements;
DELETE FROM audit_logs;

-- Re-enable triggers
ALTER TABLE stock_movements ENABLE TRIGGER trg_prevent_stock_movement_delete;
ALTER TABLE audit_logs ENABLE TRIGGER no_delete_audit;
