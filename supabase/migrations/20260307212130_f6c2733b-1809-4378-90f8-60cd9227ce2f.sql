
-- =================================================
-- Production Performance Indexes
-- =================================================

-- service_orders: filtered by status in nearly every query (lists, queues, dashboard)
CREATE INDEX IF NOT EXISTS idx_so_status ON service_orders (status);

-- service_orders: work queues filter by technician
CREATE INDEX IF NOT EXISTS idx_so_technician ON service_orders (assigned_technician_id) WHERE assigned_technician_id IS NOT NULL;

-- service_orders: collection point filtering (commissions, portal, queues)
CREATE INDEX IF NOT EXISTS idx_so_collection_point ON service_orders (collection_point_id) WHERE collection_point_id IS NOT NULL;

-- service_orders: composite for queue ordering (status + priority + created_at)
CREATE INDEX IF NOT EXISTS idx_so_status_priority_created ON service_orders (status, priority, created_at);

-- service_orders: customer lookup (detail pages, portal)
CREATE INDEX IF NOT EXISTS idx_so_customer ON service_orders (customer_id);

-- service_orders: list page default sort
CREATE INDEX IF NOT EXISTS idx_so_created_desc ON service_orders (created_at DESC);

-- financial_entries: overdue automation and finance dashboard filter
CREATE INDEX IF NOT EXISTS idx_fe_status ON financial_entries (status);

-- financial_entries: overdue job targets pending/partial with past due_date
CREATE INDEX IF NOT EXISTS idx_fe_due_date_status ON financial_entries (due_date, status) WHERE status IN ('pending', 'partial') AND due_date IS NOT NULL;

-- financial_entries: dashboard aggregation by type + date range
CREATE INDEX IF NOT EXISTS idx_fe_type_created ON financial_entries (entry_type, created_at);

-- financial_entries: link lookups
CREATE INDEX IF NOT EXISTS idx_fe_service_order ON financial_entries (service_order_id) WHERE service_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fe_quote ON financial_entries (quote_id) WHERE quote_id IS NOT NULL;

-- repair_quotes: expiration job targets sent quotes with expires_at
CREATE INDEX IF NOT EXISTS idx_rq_status_expires ON repair_quotes (status, expires_at) WHERE status = 'sent' AND expires_at IS NOT NULL;

-- repair_quotes: lookup by service order (detail page, delivery trigger)
CREATE INDEX IF NOT EXISTS idx_rq_service_order ON repair_quotes (service_order_id);

-- service_order_status_history: timeline display per order
CREATE INDEX IF NOT EXISTS idx_sosh_order_created ON service_order_status_history (service_order_id, created_at);

-- repair_parts_used: parts list per service order
CREATE INDEX IF NOT EXISTS idx_rpu_service_order ON repair_parts_used (service_order_id);

-- stock_movements: movement history per product
CREATE INDEX IF NOT EXISTS idx_sm_product_created ON stock_movements (product_id, created_at DESC);

-- collection_point_commissions: duplicate check in delivery trigger
CREATE INDEX IF NOT EXISTS idx_cpc_so_cp ON collection_point_commissions (service_order_id, collection_point_id);

-- payments: lookup by financial entry
CREATE INDEX IF NOT EXISTS idx_pay_entry ON payments (financial_entry_id);
