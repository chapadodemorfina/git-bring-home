
-- =====================================================
-- SEED: Diagnostics, Faults, Tests, Parts, Quotes
-- =====================================================

-- Diagnostics
INSERT INTO diagnostics (id, service_order_id, diagnosis_status, technical_findings, probable_cause, repair_complexity, repair_viability, estimated_cost, estimated_repair_hours, diagnosed_by, diagnosis_started_at) VALUES
  ('d1a00001-bbbb-4000-8000-000000000001', '3435e9b9-ad58-419f-9f4d-7111d86f2a01', 'in_progress', 'Tela trincada, touch parcial', 'Queda', 'moderate', 'repairable', 350, 2, 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '2 days');

INSERT INTO diagnostics (id, service_order_id, diagnosis_status, technical_findings, probable_cause, repair_complexity, repair_viability, estimated_cost, estimated_repair_hours, diagnosed_by, diagnosis_started_at, diagnosis_completed_at) VALUES
  ('d1a00002-bbbb-4000-8000-000000000002', '2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'completed', 'Bateria 67%, conector oxidado', 'Desgaste + umidade', 'simple', 'repairable', 280, 1.5, 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '5 days', now() - interval '3 days'),
  ('d1a00003-bbbb-4000-8000-000000000003', '891892ea-2437-469f-9a17-16e5ccbde865', 'completed', 'Placa em curto. Chip U3200 queimado.', 'Surto elétrico', 'complex', 'repairable', 650, 4, 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '6 days', now() - interval '4 days'),
  ('d1a00004-bbbb-4000-8000-000000000004', '4a94febe-ccd1-4081-b61f-9b1202c62d14', 'completed', 'Teclado inoperante. Flat cable danificado.', 'Líquido derramado', 'simple', 'repairable', 180, 1, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '4 days', now() - interval '3 days'),
  ('d1a00005-bbbb-4000-8000-000000000005', 'a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'completed', 'LCD manchas e dead pixels', 'Pressão na tela', 'moderate', 'repairable', 420, 2.5, 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '7 days', now() - interval '5 days'),
  ('d1a00006-bbbb-4000-8000-000000000006', '92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'completed', 'Fonte ATX queimada. GPU e RAM OK.', 'Instabilidade elétrica', 'simple', 'repairable', 250, 1, 'cbc83ea0-d38a-4204-9864-db3047a88921', now() - interval '3 days', now() - interval '2 days'),
  ('d1a00007-bbbb-4000-8000-000000000007', '3c109ebe-0641-4306-9441-c9d584a298e3', 'completed', 'SSD defeituoso. Backup parcial.', 'Falha natural', 'moderate', 'repairable', 380, 2, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c', now() - interval '10 days', now() - interval '8 days');

-- Diagnosis Faults
INSERT INTO diagnosis_faults (diagnosis_id, fault_type, fault_description, severity, confirmed) VALUES
  ('d1a00001-bbbb-4000-8000-000000000001', 'Tela Trincada', 'Trinca severa', 'critical', true),
  ('d1a00001-bbbb-4000-8000-000000000001', 'Touch Parcial', 'Touch metade superior falha', 'severe', true),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Bateria Degradada', '67%', 'severe', true),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Conector Oxidado', 'Oxidação leve', 'minor', true),
  ('d1a00003-bbbb-4000-8000-000000000003', 'Curto na Placa', 'Alimentação em curto', 'critical', true),
  ('d1a00003-bbbb-4000-8000-000000000003', 'Chip Queimado', 'U3200', 'critical', true),
  ('d1a00004-bbbb-4000-8000-000000000004', 'Teclado Danificado', 'F1-F4 ESC inoperantes', 'severe', true),
  ('d1a00005-bbbb-4000-8000-000000000005', 'LCD Danificado', 'Manchas e dead pixels', 'severe', true),
  ('d1a00006-bbbb-4000-8000-000000000006', 'Fonte Queimada', 'Capacitores estufados', 'critical', true),
  ('d1a00007-bbbb-4000-8000-000000000007', 'SSD Defeituoso', 'Setores defeituosos', 'critical', true);

-- Diagnosis Tests
INSERT INTO diagnosis_tests (diagnosis_id, test_name, test_category, test_result, measured_value, sort_order) VALUES
  ('d1a00001-bbbb-4000-8000-000000000001', 'Touch Screen', 'Display', 'fail', 'Falha parcial', 1),
  ('d1a00001-bbbb-4000-8000-000000000001', 'Display Output', 'Display', 'fail', 'Trincado', 2),
  ('d1a00001-bbbb-4000-8000-000000000001', 'Bateria', 'Energia', 'pass', '92%', 3),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Capacidade Bateria', 'Energia', 'fail', '67%', 1),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Carregamento', 'Energia', 'fail', 'Intermitente', 2),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Face ID', 'Biometria', 'pass', 'OK', 3),
  ('d1a00003-bbbb-4000-8000-000000000003', 'POST/Boot', 'Sistema', 'fail', 'Não liga', 1),
  ('d1a00003-bbbb-4000-8000-000000000003', 'Tensão 19V', 'Energia', 'fail', '0V', 2),
  ('d1a00003-bbbb-4000-8000-000000000003', 'RAM Test', 'Memória', 'pass', '16GB OK', 3),
  ('d1a00005-bbbb-4000-8000-000000000005', 'Display LCD', 'Display', 'fail', 'Manchas', 1),
  ('d1a00005-bbbb-4000-8000-000000000005', 'Touch Digitizer', 'Display', 'pass', 'OK', 2),
  ('d1a00006-bbbb-4000-8000-000000000006', 'Fonte ATX', 'Energia', 'fail', 'Sem tensão', 1),
  ('d1a00006-bbbb-4000-8000-000000000006', 'RAM Memtest', 'Memória', 'pass', '32GB OK', 2);

-- Diagnosis Parts
INSERT INTO diagnosis_parts (diagnosis_id, part_name, quantity, estimated_unit_cost, supplier) VALUES
  ('d1a00001-bbbb-4000-8000-000000000001', 'Tela Samsung S23 Ultra', 1, 280, 'SB Digital'),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Bateria iPhone 14 Pro Max', 1, 120, 'SB Digital'),
  ('d1a00002-bbbb-4000-8000-000000000002', 'Conector Lightning', 1, 45, 'Gama Informática'),
  ('d1a00003-bbbb-4000-8000-000000000003', 'Chip U3200 Dell', 1, 85, 'DigiKey'),
  ('d1a00004-bbbb-4000-8000-000000000004', 'Teclado Lenovo ThinkPad T14s', 1, 130, 'Techno Space'),
  ('d1a00005-bbbb-4000-8000-000000000005', 'Tela LCD iPad Air 5', 1, 320, 'SB Digital'),
  ('d1a00006-bbbb-4000-8000-000000000006', 'Fonte ATX 650W 80Plus', 1, 180, 'Gama Informática'),
  ('d1a00007-bbbb-4000-8000-000000000007', 'SSD NVMe 512GB Apple', 1, 250, 'Arrow Electronics');

-- Repair Quotes (valid hex UUIDs)
INSERT INTO repair_quotes (id, service_order_id, quote_number, status, discount_percent, discount_amount, analysis_fee, total_amount, expires_at, notes, created_by) VALUES
  ('a1b00001-cccc-4000-8000-000000000001', '2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'ORC-001151', 'approved', 0, 0, 50, 330, now() + interval '15 days', 'Bateria + conector', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('a1b00002-cccc-4000-8000-000000000002', '891892ea-2437-469f-9a17-16e5ccbde865', 'ORC-001152', 'approved', 5, 35, 80, 685, now() + interval '15 days', 'Reballing U3200', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('a1b00003-cccc-4000-8000-000000000003', '4a94febe-ccd1-4081-b61f-9b1202c62d14', 'ORC-001153', 'sent', 0, 0, 0, 230, now() + interval '10 days', 'Teclado ThinkPad', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('a1b00004-cccc-4000-8000-000000000004', 'a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'ORC-001155', 'approved', 0, 0, 0, 520, now() + interval '15 days', 'LCD iPad Air 5', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('a1b00005-cccc-4000-8000-000000000005', '92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'ORC-001158', 'approved', 0, 0, 0, 280, now() + interval '15 days', 'Fonte ATX', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('a1b00006-cccc-4000-8000-000000000006', '3c109ebe-0641-4306-9441-c9d584a298e3', 'ORC-001159', 'approved', 10, 43, 50, 437, now() + interval '15 days', 'SSD MacBook', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c');

-- Quote Items
INSERT INTO repair_quote_items (quote_id, item_type, description, quantity, unit_price, total_price, sort_order) VALUES
  ('a1b00001-cccc-4000-8000-000000000001', 'part', 'Bateria iPhone 14 Pro Max', 1, 180, 180, 1),
  ('a1b00001-cccc-4000-8000-000000000001', 'part', 'Conector Lightning', 1, 65, 65, 2),
  ('a1b00001-cccc-4000-8000-000000000001', 'labor', 'Mão de obra', 1, 85, 85, 3),
  ('a1b00002-cccc-4000-8000-000000000002', 'part', 'Chip U3200', 1, 150, 150, 1),
  ('a1b00002-cccc-4000-8000-000000000002', 'part', 'Materiais solda BGA', 1, 55, 55, 2),
  ('a1b00002-cccc-4000-8000-000000000002', 'labor', 'Reballing e microsoldagem', 1, 400, 400, 3),
  ('a1b00003-cccc-4000-8000-000000000003', 'part', 'Teclado ThinkPad T14s', 1, 160, 160, 1),
  ('a1b00003-cccc-4000-8000-000000000003', 'labor', 'Mão de obra', 1, 70, 70, 2),
  ('a1b00004-cccc-4000-8000-000000000004', 'part', 'Tela LCD iPad Air 5', 1, 380, 380, 1),
  ('a1b00004-cccc-4000-8000-000000000004', 'labor', 'Mão de obra troca tela', 1, 140, 140, 2),
  ('a1b00005-cccc-4000-8000-000000000005', 'part', 'Fonte ATX 650W 80Plus', 1, 210, 210, 1),
  ('a1b00005-cccc-4000-8000-000000000005', 'labor', 'Instalação e teste', 1, 70, 70, 2),
  ('a1b00006-cccc-4000-8000-000000000006', 'part', 'SSD NVMe 512GB Apple', 1, 300, 300, 1),
  ('a1b00006-cccc-4000-8000-000000000006', 'labor', 'Instalação + restauração macOS', 1, 130, 130, 2);
