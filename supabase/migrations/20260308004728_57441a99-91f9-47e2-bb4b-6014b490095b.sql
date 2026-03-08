
-- ══════════════════════════════════════════════════════════
-- INDEX OPTIMIZATION
-- ══════════════════════════════════════════════════════════

-- service_orders
CREATE INDEX IF NOT EXISTS idx_so_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_technician ON service_orders(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_so_created_at ON service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_so_collection_point ON service_orders(collection_point_id);
CREATE INDEX IF NOT EXISTS idx_so_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status_created ON service_orders(status, created_at DESC);

-- financial_entries
CREATE INDEX IF NOT EXISTS idx_fe_so ON financial_entries(service_order_id);
CREATE INDEX IF NOT EXISTS idx_fe_status ON financial_entries(status);
CREATE INDEX IF NOT EXISTS idx_fe_due_date ON financial_entries(due_date);
CREATE INDEX IF NOT EXISTS idx_fe_type_status ON financial_entries(entry_type, status);
CREATE INDEX IF NOT EXISTS idx_fe_customer ON financial_entries(customer_id);

-- stock_movements
CREATE INDEX IF NOT EXISTS idx_sm_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_sm_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_type ON stock_movements(movement_type);

-- repair_quotes
CREATE INDEX IF NOT EXISTS idx_rq_so ON repair_quotes(service_order_id);
CREATE INDEX IF NOT EXISTS idx_rq_status ON repair_quotes(status);

-- service_order_status_history
CREATE INDEX IF NOT EXISTS idx_sosh_so ON service_order_status_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_sosh_created ON service_order_status_history(created_at DESC);

-- warranties
CREATE INDEX IF NOT EXISTS idx_warranties_so ON warranties(service_order_id);
CREATE INDEX IF NOT EXISTS idx_warranties_customer ON warranties(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranties_end ON warranties(end_date);

-- warranty_returns
CREATE INDEX IF NOT EXISTS idx_wr_warranty ON warranty_returns(warranty_id);

-- diagnostics
CREATE INDEX IF NOT EXISTS idx_diag_so ON diagnostics(service_order_id);

-- devices
CREATE INDEX IF NOT EXISTS idx_devices_customer ON devices(customer_id);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document);

-- notification_queue
CREATE INDEX IF NOT EXISTS idx_nq_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_nq_next ON notification_queue(next_attempt_at) WHERE status = 'pending';

-- pickups_deliveries
CREATE INDEX IF NOT EXISTS idx_pd_so ON pickups_deliveries(service_order_id);
CREATE INDEX IF NOT EXISTS idx_pd_status ON pickups_deliveries(status);

-- products
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(quantity, minimum_quantity) WHERE is_active = true;

-- commissions
CREATE INDEX IF NOT EXISTS idx_cpc_so ON collection_point_commissions(service_order_id);
CREATE INDEX IF NOT EXISTS idx_cpc_cp ON collection_point_commissions(collection_point_id);

-- repair_parts_used
CREATE INDEX IF NOT EXISTS idx_rpu_so ON repair_parts_used(service_order_id);
CREATE INDEX IF NOT EXISTS idx_rpu_product ON repair_parts_used(product_id);

-- ══════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS
-- ══════════════════════════════════════════════════════════

-- Dashboard KPIs (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_kpis AS
SELECT
  COUNT(*) FILTER (WHERE so.status NOT IN ('delivered', 'cancelled')) as open_orders,
  COUNT(*) FILTER (WHERE so.status = 'delivered') as delivered_orders,
  COUNT(*) FILTER (WHERE so.created_at >= CURRENT_DATE) as today_received,
  COUNT(*) as total_orders,
  COALESCE(SUM(fe.revenue), 0) as total_revenue,
  COALESCE(SUM(fe.revenue) FILTER (WHERE fe.created >= date_trunc('month', now())), 0) as month_revenue,
  COALESCE(SUM(fe.revenue) FILTER (WHERE fe.created >= CURRENT_DATE), 0) as today_revenue
FROM service_orders so
LEFT JOIN LATERAL (
  SELECT SUM(amount) as revenue, MIN(created_at) as created
  FROM financial_entries
  WHERE service_order_id = so.id AND entry_type = 'revenue' AND status <> 'cancelled'
) fe ON true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_kpis ON mv_dashboard_kpis(open_orders);

-- Technician Performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_technician_performance AS
SELECT
  p.id as technician_id,
  p.full_name as technician_name,
  COUNT(so.id) as total_orders,
  COUNT(so.id) FILTER (WHERE so.status = 'delivered') as delivered_orders,
  COALESCE(SUM(rq.total_amount) FILTER (WHERE rq.status = 'approved'), 0) as total_revenue,
  ROUND(AVG(EXTRACT(EPOCH FROM (
    COALESCE(h_done.done_at, now()) - so.created_at
  )) / 3600)::numeric, 1) as avg_hours_to_complete,
  COUNT(DISTINCT rpu.product_id) as distinct_parts_used
FROM profiles p
JOIN service_orders so ON so.assigned_technician_id = p.id
LEFT JOIN repair_quotes rq ON rq.service_order_id = so.id
LEFT JOIN repair_parts_used rpu ON rpu.service_order_id = so.id
LEFT JOIN LATERAL (
  SELECT MIN(created_at) as done_at FROM service_order_status_history
  WHERE service_order_id = so.id AND to_status IN ('delivered', 'ready_for_pickup')
) h_done ON true
GROUP BY p.id, p.full_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tech_perf ON mv_technician_performance(technician_id);

-- Partner Revenue
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_partner_performance AS
SELECT
  cp.id as collection_point_id,
  cp.name as collection_point_name,
  COUNT(so.id) as total_orders,
  COALESCE(SUM(fe.amount) FILTER (WHERE fe.entry_type = 'revenue'), 0) as total_revenue,
  COALESCE(SUM(cpc.calculated_amount), 0) as total_commissions,
  COUNT(rq.id) FILTER (WHERE rq.status = 'approved') as approved_quotes,
  COUNT(rq.id) as total_quotes
FROM collection_points cp
LEFT JOIN service_orders so ON so.collection_point_id = cp.id
LEFT JOIN financial_entries fe ON fe.service_order_id = so.id AND fe.status <> 'cancelled'
LEFT JOIN collection_point_commissions cpc ON cpc.service_order_id = so.id AND cpc.collection_point_id = cp.id
LEFT JOIN repair_quotes rq ON rq.service_order_id = so.id
WHERE cp.is_active = true
GROUP BY cp.id, cp.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_partner_perf ON mv_partner_performance(collection_point_id);

-- Inventory Usage
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_usage AS
SELECT
  pr.id as product_id,
  pr.name as product_name,
  pr.sku,
  pr.quantity as current_stock,
  pr.minimum_quantity,
  pr.cost_price,
  pr.sale_price,
  COALESCE(usage.total_consumed, 0) as total_consumed,
  COALESCE(usage.total_cost, 0) as total_cost_consumed,
  COALESCE(usage.orders_used_in, 0) as orders_used_in
FROM products pr
LEFT JOIN LATERAL (
  SELECT SUM(quantity) as total_consumed, SUM(total_cost) as total_cost, COUNT(DISTINCT service_order_id) as orders_used_in
  FROM repair_parts_used WHERE product_id = pr.id
) usage ON true
WHERE pr.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inv_usage ON mv_inventory_usage(product_id);

-- ══════════════════════════════════════════════════════════
-- REFRESH FUNCTION
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpis;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_technician_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_partner_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_usage;
END;
$$;
