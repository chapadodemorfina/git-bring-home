
-- =====================================================
-- SEED DATA: Profiles, Collection Points, Service Orders
-- =====================================================

-- 1. Update profiles with real names
UPDATE profiles SET full_name = 'Saulo Cintra' WHERE id = 'cbc83ea0-d38a-4204-9864-db3047a88921';
UPDATE profiles SET full_name = 'Admin i9 Solution' WHERE id = '4177c9bc-9b1f-4078-ba30-eeabef7e9796';
UPDATE profiles SET full_name = 'Atendimento i9' WHERE id = 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c';

-- 2. Create Collection Points
INSERT INTO collection_points (id, name, company_name, responsible_person, phone, whatsapp, email, street, number, neighborhood, city, state, zip_code, commission_type, commission_value, is_active, created_by)
VALUES 
  ('c1a00001-aaaa-4000-8000-000000000001', 'Ponto Boa Viagem', 'Eletrônicos BV LTDA', 'Ricardo Melo', '(81) 3462-1100', '(81) 99900-1122', 'contato@eletronicasbv.com.br', 'Av. Conselheiro Aguiar', '2034', 'Boa Viagem', 'Recife', 'PE', '51020-020', 'percentage', 10, true, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('c1a00002-aaaa-4000-8000-000000000002', 'Ponto Casa Forte', 'Tech Express CF', 'Amanda Souza', '(81) 3268-3300', '(81) 99800-3344', 'amanda@techexpresscf.com.br', 'Rua do Futuro', '455', 'Casa Forte', 'Recife', 'PE', '52060-350', 'fixed_per_order', 25, true, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('c1a00003-aaaa-4000-8000-000000000003', 'Ponto Olinda', 'Cell Fix Olinda', 'Marcos Vinícius', '(81) 3429-7700', '(81) 99700-5566', 'marcos@cellfixolinda.com.br', 'Av. Presidente Kennedy', '1200', 'Peixinhos', 'Olinda', 'PE', '53230-530', 'percentage', 12, true, '4177c9bc-9b1f-4078-ba30-eeabef7e9796');

-- 3. Assign technicians and collection points to service orders
UPDATE service_orders SET assigned_technician_id = 'cbc83ea0-d38a-4204-9864-db3047a88921' WHERE order_number IN ('OS-001150', 'OS-001151', 'OS-001152', 'OS-001155', 'OS-001158');
UPDATE service_orders SET assigned_technician_id = 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c' WHERE order_number IN ('OS-001153', 'OS-001154', 'OS-001159');
UPDATE service_orders SET collection_point_id = 'c1a00001-aaaa-4000-8000-000000000001' WHERE order_number = 'OS-001156';
UPDATE service_orders SET collection_point_id = 'c1a00002-aaaa-4000-8000-000000000002' WHERE order_number = 'OS-001157';
UPDATE service_orders SET created_by = '4177c9bc-9b1f-4078-ba30-eeabef7e9796' WHERE created_by IS NULL;

-- 4. Status history for all orders
INSERT INTO service_order_status_history (service_order_id, from_status, to_status, notes, changed_by) VALUES
  -- OS-001150: received -> triage -> awaiting_diagnosis
  ('3435e9b9-ad58-419f-9f4d-7111d86f2a01', NULL, 'received', 'Entrada pelo balcão', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('3435e9b9-ad58-419f-9f4d-7111d86f2a01', 'received', 'triage', 'Triagem concluída', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('3435e9b9-ad58-419f-9f4d-7111d86f2a01', 'triage', 'awaiting_diagnosis', 'Encaminhado ao técnico Saulo', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  -- OS-001151: received -> triage -> awaiting_diagnosis -> in_repair
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', NULL, 'received', 'Recebido via WhatsApp', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'triage', 'awaiting_diagnosis', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('2a0a84fa-ed2e-4dce-9b91-3f1403b38937', 'awaiting_diagnosis', 'in_repair', 'Diagnóstico concluído, iniciando reparo', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  -- OS-001152: received -> triage -> awaiting_diagnosis -> awaiting_parts
  ('891892ea-2437-469f-9a17-16e5ccbde865', NULL, 'received', 'Notebook urgente', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('891892ea-2437-469f-9a17-16e5ccbde865', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('891892ea-2437-469f-9a17-16e5ccbde865', 'triage', 'awaiting_diagnosis', NULL, 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('891892ea-2437-469f-9a17-16e5ccbde865', 'awaiting_diagnosis', 'awaiting_parts', 'Peça de reposição não disponível em estoque', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  -- OS-001153: received -> ... -> awaiting_customer_approval
  ('4a94febe-ccd1-4081-b61f-9b1202c62d14', NULL, 'received', NULL, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('4a94febe-ccd1-4081-b61f-9b1202c62d14', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('4a94febe-ccd1-4081-b61f-9b1202c62d14', 'triage', 'awaiting_diagnosis', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('4a94febe-ccd1-4081-b61f-9b1202c62d14', 'awaiting_diagnosis', 'awaiting_quote', 'Orçamento sendo elaborado', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('4a94febe-ccd1-4081-b61f-9b1202c62d14', 'awaiting_quote', 'awaiting_customer_approval', 'Orçamento enviado ao cliente', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  -- OS-001154: full flow -> ready_for_pickup
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', NULL, 'received', NULL, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'triage', 'awaiting_diagnosis', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'awaiting_diagnosis', 'in_repair', 'Reparo simples', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'in_repair', 'in_testing', 'Reparo concluído, testando', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('25b53e4d-91d4-47a3-acf0-f1748afa0bf8', 'in_testing', 'ready_for_pickup', 'Todos os testes passaram', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  -- OS-001155: ... -> in_testing
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', NULL, 'received', NULL, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'triage', 'awaiting_diagnosis', NULL, 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'awaiting_diagnosis', 'in_repair', 'Troca de tela', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('a230dc5b-8380-408d-bea6-ff8fc4992d2d', 'in_repair', 'in_testing', 'Reparo finalizado, testando touch e display', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  -- OS-001156: received
  ('599a63b5-f671-4266-897c-c2df075e5c8e', NULL, 'received', 'Recebido via ponto de coleta Boa Viagem', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  -- OS-001157: received -> triage
  ('3a49347e-d5f7-4b0e-9caf-0f9a585ac824', NULL, 'received', 'Recebido via ponto de coleta Casa Forte', '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('3a49347e-d5f7-4b0e-9caf-0f9a585ac824', 'received', 'triage', 'Iniciando triagem', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  -- OS-001158: ... -> in_repair
  ('92cf0f3e-eb73-459d-b1d7-90be6ea37646', NULL, 'received', NULL, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'triage', 'awaiting_diagnosis', NULL, 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  ('92cf0f3e-eb73-459d-b1d7-90be6ea37646', 'awaiting_diagnosis', 'in_repair', 'Fonte queimada, substituindo', 'cbc83ea0-d38a-4204-9864-db3047a88921'),
  -- OS-001159: full flow -> delivered
  ('3c109ebe-0641-4306-9441-c9d584a298e3', NULL, 'received', NULL, '4177c9bc-9b1f-4078-ba30-eeabef7e9796'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'received', 'triage', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'triage', 'awaiting_diagnosis', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'awaiting_diagnosis', 'in_repair', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'in_repair', 'in_testing', NULL, 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'in_testing', 'ready_for_pickup', 'Aprovado em todos os testes', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c'),
  ('3c109ebe-0641-4306-9441-c9d584a298e3', 'ready_for_pickup', 'delivered', 'Entregue à cliente Patricia', 'ba75b1a4-5835-4fcf-82c9-be3b6991ef5c');

-- 5. App settings
INSERT INTO app_settings (key, value, description) VALUES ('company_name', 'i9 Solution', 'Nome da empresa')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
