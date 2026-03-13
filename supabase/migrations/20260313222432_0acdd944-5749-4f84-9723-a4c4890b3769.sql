
-- =====================================================
-- SEED: Financial, Logistics, Stock, Warranties, etc.
-- =====================================================

-- Financial Entries
INSERT INTO financial_entries (id, entry_type, status, description, amount, paid_amount, due_date, service_order_id, customer_id, category, created_by) VALUES
  -- Receitas (ordens aprovadas/entregues)
  ('f1a00001-dddd-4000-8000-000000000001', 'revenue', 'paid', 'Reparo iPhone 14 Pro Max - OS-001151', 330, 330, (now() - interval '1 day')::date, '2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'a1000001-0000-0000-0000-000000000002', 'Serviço de Reparo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00002-dddd-4000-8000-000000000002', 'revenue', 'pending', 'Reballing Dell Latitude - OS-001152', 685, 0, (now() + interval '7 days')::date, '891892ea-2437-469f-9a17-16e5ccbde865', 'a1000001-0000-0000-0000-000000000003', 'Serviço de Reparo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00003-dddd-4000-8000-000000000003', 'revenue', 'paid', 'Troca LCD iPad Air 5 - OS-001155', 520, 520, (now() - interval '2 days')::date, 'a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'a1000001-0000-0000-0000-000000000005', 'Serviço de Reparo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00004-dddd-4000-8000-000000000004', 'revenue', 'paid', 'Troca SSD MacBook - OS-001159', 437, 437, (now() - interval '5 days')::date, '3c109ebe-0641-4306-9441-c9d584a298e3', 'a1000001-0000-0000-0000-000000000012', 'Serviço de Reparo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00005-dddd-4000-8000-000000000005', 'revenue', 'partial', 'Troca fonte ATX - OS-001158', 280, 150, (now() + interval '3 days')::date, '92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'a1000001-0000-0000-0000-000000000008', 'Serviço de Reparo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  -- Despesas
  ('f1a00006-dddd-4000-8000-000000000006', 'expense', 'paid', 'Compra de peças - SB Digital (lote telas)', 2500, 2500, (now() - interval '10 days')::date, NULL, NULL, 'Compra de Peças', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00007-dddd-4000-8000-000000000007', 'expense', 'paid', 'Aluguel sala comercial Março/2026', 3200, 3200, (now() - interval '15 days')::date, NULL, NULL, 'Aluguel', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00008-dddd-4000-8000-000000000008', 'expense', 'pending', 'Compra ferramentas microsoldagem', 890, 0, (now() + interval '5 days')::date, NULL, NULL, 'Ferramentas', '4177c9bc-9b1f-4078-ba30-eeabef7e9796');

-- Payments
INSERT INTO payments (financial_entry_id, amount, payment_method, payment_date, reference, created_by) VALUES
  ('f1a00001-dddd-4000-8000-000000000001', 330, 'pix', now() - interval '1 day', 'PIX-001151', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00003-dddd-4000-8000-000000000003', 520, 'credit_card', now() - interval '2 days', 'CC-001155', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00004-dddd-4000-8000-000000000004', 437, 'pix', now() - interval '5 days', 'PIX-001159', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00005-dddd-4000-8000-000000000005', 150, 'debit_card', now() - interval '1 day', 'DB-001158-PARCIAL', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00006-dddd-4000-8000-000000000006', 2500, 'bank_transfer', now() - interval '10 days', 'TED-SBDigital-Mar', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('f1a00007-dddd-4000-8000-000000000007', 3200, 'boleto', now() - interval '15 days', 'BOL-ALUGUEL-MAR26', '4177c9bc-9b1f-4078-ba30-eeabef7e9796');

-- Pickups & Deliveries
INSERT INTO pickups_deliveries (service_order_id, logistics_type, status, address_street, address_number, address_neighborhood, address_city, address_state, address_zip, contact_name, contact_phone, driver_name, created_by) VALUES
  ('599a63b5-f671-4266-897c-c2df075e5c8e', 'pickup', 'picked_up', 'Av. Conselheiro Aguiar', '2034', 'Boa Viagem', 'Recife', 'PE', '51020-020', 'Ricardo Melo', '(81) 99900-1122', 'João Motoboy', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'delivery', 'returned', 'Rua das Flores', '150', 'Espinheiro', 'Recife', 'PE', '52020-100', 'Patricia Ribeiro', '(81) 99109-8765', 'Carlos Motoboy', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'delivery', 'ready_for_return', 'Av. Norte Miguel Arraes', '500', 'Tamarineira', 'Recife', 'PE', '52041-080', 'Ana Paula Oliveira', '(81) 99654-3210', NULL, '4177c9bc-9b1f-4078-ba30-eeabef7e9796');

-- Collection Transfers
INSERT INTO collection_transfers (service_order_id, collection_point_id, status, direction, tracking_code, transferred_by, transferred_at, notes) VALUES
  ('599a63b5-f671-4266-897c-c2df075e5c8e', 'c1a00001-aaaa-4000-8000-000000000001', 'received_at_center', 'to_center', 'TR-BV-001', '4177c9bc-9b1f-4078-ba30-eeabef7e9796', now() - interval '1 day', 'Coletado pelo motoboy'),
  ('3a49347e-d5f7-4b0e-9caf-0f9a585ac824', 'c1a00002-aaaa-4000-8000-000000000002', 'in_transit_to_center', 'to_center', 'TR-CF-001', '4177c9bc-9b1f-4078-ba30-eeabef7e9796', now(), 'Em trânsito para centro técnico');

-- Stock Movements (some products)
INSERT INTO stock_movements (product_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference_type, notes, created_by) VALUES
  ('22f9567b-151e-473d-ad5a-9b02bb117c07', 'entry', 10, 0, 10, 85, 'purchase', 'Compra inicial lote telas iPhone 11', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('22f9567b-151e-473d-ad5a-9b02bb117c07', 'exit', 5, 10, 5, 85, 'repair', 'Consumo em reparos diversos', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('aaa787c9-65b7-48c9-8fed-f04e5b8b3545', 'entry', 8, 0, 8, 110, 'purchase', 'Lote telas iPhone 12', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('aaa787c9-65b7-48c9-8fed-f04e5b8b3545', 'exit', 4, 8, 4, 110, 'repair', 'Consumo em reparos', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('ce6c775f-c92d-45a6-b37f-a21b4cbed14a', 'entry', 12, 0, 12, 42, 'purchase', 'Lote telas Samsung A10', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('ce6c775f-c92d-45a6-b37f-a21b4cbed14a', 'exit', 6, 12, 6, 42, 'repair', 'Consumo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('80ae8250-c3e8-43ac-8da9-aa39cb71f784', 'entry', 5, 0, 5, 135, 'purchase', 'Telas iPhone 13', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('80ae8250-c3e8-43ac-8da9-aa39cb71f784', 'exit', 2, 5, 3, 135, 'repair', 'Consumo', '4177c9bc-9b1f-4078-ba30-eeabef7e9796');

-- Repair Services (repair log)
INSERT INTO repair_services (service_order_id, action_type, description, technician_id, time_spent_minutes) VALUES
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'repair', 'Troca de bateria iPhone 14 Pro Max', 'cbc83ea0-d38a-4204-9864-db3047a88921', 45),
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'repair', 'Limpeza e troca conector Lightning', 'cbc83ea0-d38a-4204-9864-db3047a88921', 30),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'repair', 'Troca display LCD iPad Air 5', 'cbc83ea0-d38a-4204-9864-db3047a88921', 90),
  ('92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'repair', 'Substituição fonte ATX 650W', 'cbc83ea0-d38a-4204-9864-db3047a88921', 40),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'repair', 'Troca SSD NVMe MacBook Air M2', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', 60),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'repair', 'Restauração macOS Ventura', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', 45);

-- Repair Tests
INSERT INTO repair_tests (service_order_id, test_name, passed, notes, tested_by, tested_at, sort_order) VALUES
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'Ligamento/Boot', true, 'Ligou normalmente', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '2 days', 1),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'Touch Screen', true, 'Touch funcional', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '2 days', 2),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'Câmera', true, 'OK', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '2 days', 3),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'Carregamento', true, 'OK', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '2 days', 4),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'Boot macOS', true, 'Inicializa normalmente', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '6 days', 1),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'Benchmark SSD', true, 'Velocidades dentro do esperado', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '6 days', 2),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'Wi-Fi/Bluetooth', true, 'OK', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '6 days', 3),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'Display LCD', true, 'Sem manchas', 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '1 day', 1),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'Touch Response', true, 'Multi-touch OK', 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '1 day', 2),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'Bateria', false, 'Dreno rápido - monitorar', 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '1 day', 3);

-- Warranty (for delivered order OS-001159)
INSERT INTO warranties (service_order_id, customer_id, warranty_number, start_date, end_date, coverage_description, terms, warranty_type, created_by) VALUES
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'a1000001-0000-0000-0000-000000000012', 'GAR-001159', (now() - interval '5 days')::date, (now() + interval '85 days')::date, 'Cobertura para SSD e serviço de instalação', 'Garantia válida por 90 dias para peças e serviço. Não cobre danos por líquidos ou quedas.', 'service', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c');

-- Device Location Tracking
INSERT INTO device_location_tracking (service_order_id, device_id, location, moved_by, notes) VALUES
  ('3435e9b9-ad58-419f-9f4d-7111d86f2a01', 'd2000001-0000-0000-0000-000000000001', 'reception', '4177c9bc-9b1f-4078-ba30-eeabef7e9796', 'Entrada no balcão'),
  ('3435e9b9-ad58-419f-9f4d-7111d86f2a01', 'd2000001-0000-0000-0000-000000000001', 'bench_1', 'cbc83ea0-d38a-4204-9864-db3047a88921', 'Encaminhado para bancada 1'),
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'd2000001-0000-0000-0000-000000000002', 'reception', '4177c9bc-9b1f-4078-ba30-eeabef7e9796', NULL),
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'd2000001-0000-0000-0000-000000000002', 'bench_1', 'cbc83ea0-d38a-4204-9864-db3047a88921', 'Em reparo'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'd2000001-0000-0000-0000-000000000005', 'ready_shelf', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', 'Pronto para retirada'),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'd2000001-0000-0000-0000-000000000006', 'testing_area', 'cbc83ea0-d38a-4204-9864-db3047a88921', 'Em testes finais');

-- Collection Point Commissions
INSERT INTO collection_point_commissions (collection_point_id, service_order_id, commission_type, commission_value, base_amount, calculated_amount, is_paid) VALUES
  ('c1a00001-aaaa-4000-8000-000000000001', '599a63b5-f671-4266-897c-c2df075e5c8e', 'percentage', 10, 0, 0, false),
  ('c1a00002-aaaa-4000-8000-000000000002', '3a49347e-d5f7-4b0e-9caf-0f9a585ac824', 'fixed_per_order', 25, 0, 25, false);
