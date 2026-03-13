
-- 1. Criar 12 clientes reais (Recife-PE)
INSERT INTO customers (id, full_name, email, phone, whatsapp, document, type) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Carlos Eduardo Ferreira', 'carlos.ferreira@gmail.com', '(81) 99876-5432', '5581998765432', '123.456.789-01', 'individual'),
  ('a1000001-0000-0000-0000-000000000002', 'Maria Aparecida dos Santos', 'maria.santos@hotmail.com', '(81) 98765-4321', '5581987654321', '234.567.890-12', 'individual'),
  ('a1000001-0000-0000-0000-000000000003', 'Tech Solutions LTDA', 'contato@techsolutions.com.br', '(81) 3222-1100', '5581988001122', '12.345.678/0001-90', 'business'),
  ('a1000001-0000-0000-0000-000000000004', 'Ana Paula Oliveira', 'anapaula.oli@yahoo.com.br', '(81) 99654-3210', '5581996543210', '345.678.901-23', 'individual'),
  ('a1000001-0000-0000-0000-000000000005', 'João Pedro Nascimento', 'jpnascimento@gmail.com', '(81) 99543-2109', '5581995432109', '456.789.012-34', 'individual'),
  ('a1000001-0000-0000-0000-000000000006', 'Escritório Moura e Associados', 'adm@mouraassociados.adv.br', '(81) 3221-5500', '5581987005500', '23.456.789/0001-01', 'business'),
  ('a1000001-0000-0000-0000-000000000007', 'Fernanda Lima Costa', 'fernanda.lima@outlook.com', '(81) 99432-1098', '5581994321098', '567.890.123-45', 'individual'),
  ('a1000001-0000-0000-0000-000000000008', 'Roberto Alves da Silva', 'roberto.alves@terra.com.br', '(81) 99321-0987', '5581993210987', '678.901.234-56', 'individual'),
  ('a1000001-0000-0000-0000-000000000009', 'Clinica Saude Total', 'ti@clinicasaudetotal.com.br', '(81) 3333-4455', '5581988334455', '34.567.890/0001-12', 'business'),
  ('a1000001-0000-0000-0000-000000000010', 'Lucas Gabriel Mendes', 'lucas.mendes@icloud.com', '(81) 99210-9876', '5581992109876', '789.012.345-67', 'individual'),
  ('a1000001-0000-0000-0000-000000000011', 'Padaria Pao Dourado', 'gerencia@paodourado.com.br', '(81) 3444-5566', '5581988445566', '45.678.901/0001-23', 'business'),
  ('a1000001-0000-0000-0000-000000000012', 'Patricia Souza Ribeiro', 'patricia.ribeiro@gmail.com', '(81) 99109-8765', '5581991098765', '890.123.456-78', 'individual');

-- 2. Criar 15 dispositivos reais
INSERT INTO devices (id, customer_id, device_type, brand, model, color, serial_number, imei, reported_issue, physical_condition) VALUES
  ('d2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'smartphone', 'Samsung', 'Galaxy S23 Ultra', 'Preto Phantom', 'RF8T40HXYZQ', '354123098765432', 'Tela trincada apos queda, touch nao responde na parte inferior', 'Trinca no canto superior direito, carcaca com arranhoes leves'),
  ('d2000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', 'smartphone', 'Apple', 'iPhone 14 Pro Max', 'Roxo Profundo', NULL, '359876543210987', 'Bateria dura apenas 2 horas, esquenta muito', 'Bom estado geral, sem danos fisicos'),
  ('d2000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', 'notebook', 'Dell', 'Latitude 5530', 'Cinza', 'DELLSVC12345', NULL, 'Nao liga, LED de carga nao acende', 'Usado, com desgaste no teclado'),
  ('d2000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000003', 'notebook', 'Lenovo', 'ThinkPad T14s Gen 3', 'Preto', 'LNVTK98765', NULL, 'Tela com manchas escuras e flickering', 'Bom estado, adesivos na tampa'),
  ('d2000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000004', 'smartphone', 'Motorola', 'Moto G73 5G', 'Azul Meteoro', NULL, '867543210987654', 'Conector de carga solto, nao carrega', 'Arranhoes na tela, pelicula danificada'),
  ('d2000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000005', 'tablet', 'Apple', 'iPad Air 5a Geracao', 'Cinza Espacial', 'F2LX87654321', NULL, 'Tela nao responde ao toque em 30 porcento da area', 'Amassado no canto inferior'),
  ('d2000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000006', 'printer', 'HP', 'LaserJet Pro M404dn', 'Branco', 'CNBR543210', NULL, 'Manchas na impressao, papel atolando frequentemente', 'Poeira interna, usado intensivamente'),
  ('d2000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000007', 'smartphone', 'Xiaomi', 'Redmi Note 12 Pro', 'Azul Glacial', NULL, '861234567890123', 'Alto-falante nao funciona, som so no fone', 'Bom estado, com capinha'),
  ('d2000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000008', 'desktop_pc', 'Custom', 'PC Gamer i7 RTX 3070', NULL, NULL, NULL, 'Tela azul frequente BSOD, reinicia sozinho', 'Desktop torre, ventilacao com poeira'),
  ('d2000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000009', 'monitor', 'LG', 'UltraWide 29WN600-W', 'Branco', 'LGMNT87654', NULL, 'Pixel morto no centro da tela, linha vertical', 'Bom estado, sem riscos'),
  ('d2000001-0000-0000-0000-000000000011', 'a1000001-0000-0000-0000-000000000009', 'notebook', 'HP', 'ProBook 450 G9', 'Cinza Prata', 'HPNB456789', NULL, 'WiFi desconecta constantemente', 'Usado, com marcas de uso'),
  ('d2000001-0000-0000-0000-000000000012', 'a1000001-0000-0000-0000-000000000010', 'smartphone', 'Samsung', 'Galaxy A54 5G', 'Verde Lima', 'RF9T50ABCDE', '352987654321098', 'Camera traseira embacada, foco nao funciona', 'Bom estado geral'),
  ('d2000001-0000-0000-0000-000000000013', 'a1000001-0000-0000-0000-000000000011', 'printer', 'Epson', 'EcoTank L3250', 'Preto', 'EPSN123456', NULL, 'Nao puxa papel, impressao com falhas', 'Tinta seca em alguns bicos'),
  ('d2000001-0000-0000-0000-000000000014', 'a1000001-0000-0000-0000-000000000012', 'notebook', 'Apple', 'MacBook Air M2', 'Meia-noite', 'FVFXM2ABC12', NULL, 'Teclado com teclas falhando (E, R, T)', 'Excelente estado, com case'),
  ('d2000001-0000-0000-0000-000000000015', 'a1000001-0000-0000-0000-000000000005', 'smartphone', 'Samsung', 'Galaxy Z Flip 5', 'Creme', NULL, '358765432109876', 'Dobradica rangendo, tela interna com linha verde', 'Marca de uso na dobradica');

-- 3. Criar 10 ordens de servico reais
INSERT INTO service_orders (customer_id, device_id, status, priority, intake_channel, reported_issue, physical_condition, accessories_received, intake_notes, expected_deadline) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'd2000001-0000-0000-0000-000000000001', 'awaiting_diagnosis', 'high', 'front_desk',
   'Tela trincada apos queda, touch nao responde na parte inferior',
   'Trinca no canto superior direito da tela, carcaca traseira com arranhoes leves',
   'Carregador original, capinha de silicone',
   'Cliente relata que o celular caiu de uma altura de 1,5m no piso de ceramica. Touch funciona parcialmente.',
   now() + interval '3 days'),

  ('a1000001-0000-0000-0000-000000000002', 'd2000001-0000-0000-0000-000000000002', 'in_repair', 'normal', 'whatsapp',
   'Bateria dura apenas 2 horas, esquenta muito durante uso',
   'Bom estado geral, sem danos fisicos visiveis',
   'Cabo Lightning, fone original',
   'Saude da bateria em 67 porcento. Cliente usa ha 2 anos sem trocar.',
   now() + interval '2 days'),

  ('a1000001-0000-0000-0000-000000000003', 'd2000001-0000-0000-0000-000000000003', 'awaiting_parts', 'urgent', 'phone',
   'Notebook nao liga, LED de carga nao acende',
   'Usado, com desgaste no teclado. Notebook de trabalho.',
   'Fonte original Dell 65W',
   'Equipamento corporativo. Cliente precisa com urgencia para trabalho remoto. Diagnosticado: placa de carga queimada.',
   now() + interval '5 days'),

  ('a1000001-0000-0000-0000-000000000003', 'd2000001-0000-0000-0000-000000000004', 'awaiting_customer_approval', 'normal', 'email',
   'Tela com manchas escuras e flickering intermitente',
   'Bom estado geral, adesivos na tampa',
   'Fonte original, mochila para notebook',
   'Flickering aparece apos 30min de uso. Provavelmente cabo flat da tela ou painel LCD danificado.',
   now() + interval '7 days'),

  ('a1000001-0000-0000-0000-000000000004', 'd2000001-0000-0000-0000-000000000005', 'ready_for_pickup', 'normal', 'front_desk',
   'Conector de carga solto, nao carrega',
   'Arranhoes na tela, pelicula danificada',
   'Nenhum acessorio',
   'Conector USB-C substituido com sucesso. Testado carregamento por 1h sem problemas.',
   now() + interval '1 day'),

  ('a1000001-0000-0000-0000-000000000005', 'd2000001-0000-0000-0000-000000000006', 'in_testing', 'high', 'front_desk',
   'Tela nao responde ao toque em 30 porcento da area',
   'Amassado no canto inferior esquerdo',
   'Cabo USB-C, Apple Pencil 2a geracao',
   'Digitalizador substituido. Em fase de testes de calibracao e resposta de toque em todas as areas.',
   now() + interval '2 days'),

  ('a1000001-0000-0000-0000-000000000006', 'd2000001-0000-0000-0000-000000000007', 'received', 'low', 'front_desk',
   'Manchas na impressao e papel atolando frequentemente',
   'Poeira interna, equipamento usado intensivamente em escritorio',
   'Cabo USB, cabo de forca, toner parcialmente usado',
   'Escritorio de advocacia. Impressora usada por 4 funcionarios. Relata atolamento em media 3x por dia.',
   now() + interval '5 days'),

  ('a1000001-0000-0000-0000-000000000007', 'd2000001-0000-0000-0000-000000000008', 'triage', 'normal', 'whatsapp',
   'Alto-falante nao funciona, som apenas pelo fone de ouvido',
   'Bom estado, com capinha protetora',
   'Capinha, pelicula de vidro extra',
   'Cliente relata que parou de funcionar apos atualizacao de software. Verificar se e hardware ou software.',
   now() + interval '4 days'),

  ('a1000001-0000-0000-0000-000000000008', 'd2000001-0000-0000-0000-000000000009', 'in_repair', 'high', 'phone',
   'Tela azul frequente BSOD, reinicia sozinho durante jogos',
   'Desktop torre, ventilacao com acumulo de poeira',
   'Nenhum - desktop sem perifericos',
   'PC Gamer com i7 12700K, RTX 3070, 32GB RAM. BSOD com erro WHEA_UNCORRECTABLE_ERROR. Possivel superaquecimento de CPU.',
   now() + interval '3 days'),

  ('a1000001-0000-0000-0000-000000000012', 'd2000001-0000-0000-0000-000000000014', 'delivered', 'normal', 'front_desk',
   'Teclado com teclas falhando (E, R, T)',
   'Excelente estado, com case protetora',
   'Carregador MagSafe, case de couro',
   'Top case completo substituido. Todas as teclas funcionando perfeitamente. Cliente satisfeita.',
   now() - interval '2 days');
