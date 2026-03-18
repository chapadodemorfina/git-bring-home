
-- Disable audit triggers temporarily to avoid FK issues
ALTER TABLE service_orders DISABLE TRIGGER audit_service_orders_delete;
ALTER TABLE repair_quotes DISABLE TRIGGER audit_repair_quotes_delete;
ALTER TABLE financial_entries DISABLE TRIGGER audit_financial_entries_delete;

-- Warranties
DELETE FROM warranty_returns;
DELETE FROM warranty_items;
DELETE FROM warranties;

-- Repair
DELETE FROM repair_parts_used;
DELETE FROM repair_services;
DELETE FROM repair_tests;

-- Quotes
DELETE FROM quote_approvals;
DELETE FROM repair_quote_items;
DELETE FROM repair_quotes;

-- Diagnostics
DELETE FROM diagnosis_faults;
DELETE FROM diagnosis_parts;
DELETE FROM diagnosis_tests;
DELETE FROM diagnostics;

-- Scrap
DELETE FROM scrap_parts_recovered;
DELETE FROM scrap_disassembly;
DELETE FROM inventory_scrap;

-- Part reservations
DELETE FROM part_reservations;

-- Financial
DELETE FROM receivable_payments;
DELETE FROM accounts_receivable;
DELETE FROM payments;
DELETE FROM financial_entries;

-- Collection points
DELETE FROM collection_point_commissions;
DELETE FROM collection_transfers;
DELETE FROM collection_point_users;
DELETE FROM collection_points;

-- Service orders
DELETE FROM service_order_public_links;
DELETE FROM service_order_attachments;
DELETE FROM service_order_status_history;
DELETE FROM device_location_tracking;
DELETE FROM service_orders;

-- Devices
DELETE FROM device_accessories;
DELETE FROM device_photos;
DELETE FROM devices;

-- Customers
DELETE FROM customer_addresses;
DELETE FROM customer_contacts;
DELETE FROM customers;

-- Re-enable audit triggers
ALTER TABLE service_orders ENABLE TRIGGER audit_service_orders_delete;
ALTER TABLE repair_quotes ENABLE TRIGGER audit_repair_quotes_delete;
ALTER TABLE financial_entries ENABLE TRIGGER audit_financial_entries_delete;

-- Clean audit logs generated
ALTER TABLE audit_logs DISABLE TRIGGER no_delete_audit;
DELETE FROM audit_logs;
ALTER TABLE audit_logs ENABLE TRIGGER no_delete_audit;
