
-- ============================================
-- PRODUCTS - PEÇAS MONITOR
-- ============================================
INSERT INTO products (sku, name, category, brand, cost_price, sale_price, quantity, minimum_quantity, supplier_id, location, notes) VALUES
('MON-TCON-GEN', 'Placa TCON monitor genérica', 'PEÇAS MONITOR', NULL, 35.00, 80.00, 4, 2, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira I1', NULL),
('MON-PRINC-LG', 'Placa principal monitor LG', 'PEÇAS MONITOR', 'LG', 55.00, 120.00, 2, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira I1', NULL),
('MON-PRINC-SA', 'Placa principal monitor Samsung', 'PEÇAS MONITOR', 'Samsung', 60.00, 130.00, 2, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira I1', NULL),
('MON-FT-GEN', 'Fonte monitor genérica 12V', 'PEÇAS MONITOR', NULL, 22.00, 55.00, 5, 2, '7e5d928a-ff2a-45a3-80f6-a2cb7e21a3e9', 'Prateleira I2', NULL),
('MON-BL-LED', 'Barra backlight LED monitor', 'PEÇAS MONITOR', NULL, 15.00, 40.00, 6, 3, 'cf4516bd-a93c-494f-830e-179239e28697', 'Prateleira I2', 'Tamanho universal'),
('MON-CB-LVDS', 'Cabo LVDS monitor', 'PEÇAS MONITOR', NULL, 8.00, 22.00, 5, 2, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Gaveta I3', NULL),

-- ============================================
-- PRODUCTS - PEÇAS TV
-- ============================================
('TV-TCON-SA', 'Placa TCON TV Samsung', 'PEÇAS TV', 'Samsung', 65.00, 140.00, 2, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira J1', NULL),
('TV-TCON-LG', 'Placa TCON TV LG', 'PEÇAS TV', 'LG', 60.00, 130.00, 2, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira J1', NULL),
('TV-PRINC-SA', 'Placa principal TV Samsung 32-43"', 'PEÇAS TV', 'Samsung', 85.00, 180.00, 2, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira J2', NULL),
('TV-PRINC-LG', 'Placa principal TV LG 32-43"', 'PEÇAS TV', 'LG', 80.00, 170.00, 2, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira J2', NULL),
('TV-FT-SA', 'Placa fonte TV Samsung', 'PEÇAS TV', 'Samsung', 55.00, 120.00, 3, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira J3', NULL),
('TV-FT-LG', 'Placa fonte TV LG', 'PEÇAS TV', 'LG', 50.00, 110.00, 3, 1, '07d9a36d-329c-41b4-a88a-f568fbd9728f', 'Prateleira J3', NULL),
('TV-LED-KIT32', 'Kit LED backlight TV 32"', 'PEÇAS TV', NULL, 25.00, 60.00, 5, 2, 'cf4516bd-a93c-494f-830e-179239e28697', 'Prateleira J4', NULL),
('TV-LED-KIT43', 'Kit LED backlight TV 43"', 'PEÇAS TV', NULL, 35.00, 80.00, 4, 2, 'cf4516bd-a93c-494f-830e-179239e28697', 'Prateleira J4', NULL),
('TV-LED-KIT50', 'Kit LED backlight TV 50"', 'PEÇAS TV', NULL, 45.00, 100.00, 3, 1, 'cf4516bd-a93c-494f-830e-179239e28697', 'Prateleira J4', NULL),

-- ============================================
-- PRODUCTS - COMPONENTES ELETRÔNICOS
-- ============================================
('COMP-MOS-4407', 'MOSFET AO4407 (P-Channel)', 'COMPONENTES ELETRÔNICOS', 'Alpha & Omega', 0.35, 1.50, 100, 20, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K1', 'SOP-8'),
('COMP-MOS-4435', 'MOSFET AO4435 (P-Channel)', 'COMPONENTES ELETRÔNICOS', 'Alpha & Omega', 0.40, 1.60, 80, 20, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K1', 'SOP-8'),
('COMP-MOS-4468', 'MOSFET AO4468 (N-Channel)', 'COMPONENTES ELETRÔNICOS', 'Alpha & Omega', 0.38, 1.50, 60, 15, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K1', 'SOP-8'),
('COMP-MOS-4803', 'MOSFET AO4803 (Dual P-Ch)', 'COMPONENTES ELETRÔNICOS', 'Alpha & Omega', 0.50, 2.00, 50, 10, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K1', 'SOP-8'),
('COMP-REG-1117', 'Regulador AMS1117 3.3V', 'COMPONENTES ELETRÔNICOS', NULL, 0.15, 0.80, 150, 30, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K2', 'SOT-223'),
('COMP-REG-2596', 'Regulador LM2596 step-down', 'COMPONENTES ELETRÔNICOS', 'TI', 1.20, 4.00, 30, 10, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K2', 'TO-263'),
('COMP-REG-7805', 'Regulador 7805 5V 1A', 'COMPONENTES ELETRÔNICOS', NULL, 0.30, 1.20, 80, 20, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K2', 'TO-220'),
('COMP-CAP-100U', 'Capacitor eletrolítico 100uF 25V', 'COMPONENTES ELETRÔNICOS', NULL, 0.08, 0.40, 200, 50, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K3', NULL),
('COMP-CAP-470U', 'Capacitor eletrolítico 470uF 25V', 'COMPONENTES ELETRÔNICOS', NULL, 0.12, 0.50, 150, 40, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K3', NULL),
('COMP-CAP-1000U', 'Capacitor eletrolítico 1000uF 16V', 'COMPONENTES ELETRÔNICOS', NULL, 0.18, 0.60, 120, 30, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K3', NULL),
('COMP-CAP-10U-SMD', 'Capacitor cerâmico 10uF SMD 0805', 'COMPONENTES ELETRÔNICOS', NULL, 0.05, 0.30, 300, 50, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K3', NULL),
('COMP-RES-10K', 'Resistor 10kΩ 1/4W', 'COMPONENTES ELETRÔNICOS', NULL, 0.02, 0.10, 500, 100, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K4', NULL),
('COMP-RES-1K', 'Resistor 1kΩ 1/4W', 'COMPONENTES ELETRÔNICOS', NULL, 0.02, 0.10, 500, 100, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K4', NULL),
('COMP-RES-4K7', 'Resistor 4.7kΩ 1/4W', 'COMPONENTES ELETRÔNICOS', NULL, 0.02, 0.10, 400, 80, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K4', NULL),
('COMP-RES-100R', 'Resistor 100Ω 1/4W', 'COMPONENTES ELETRÔNICOS', NULL, 0.02, 0.10, 400, 80, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K4', NULL),
('COMP-DIO-SS14', 'Diodo Schottky SS14 1A 40V', 'COMPONENTES ELETRÔNICOS', NULL, 0.06, 0.30, 200, 40, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K5', 'SMA'),
('COMP-DIO-4148', 'Diodo 1N4148', 'COMPONENTES ELETRÔNICOS', NULL, 0.03, 0.15, 300, 50, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K5', NULL),
('COMP-DIO-4007', 'Diodo retificador 1N4007', 'COMPONENTES ELETRÔNICOS', NULL, 0.04, 0.15, 250, 50, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K5', NULL),
('COMP-XTAL-25M', 'Cristal oscilador 25MHz', 'COMPONENTES ELETRÔNICOS', NULL, 0.25, 1.00, 40, 10, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K6', 'HC-49S'),
('COMP-XTAL-32K', 'Cristal 32.768kHz', 'COMPONENTES ELETRÔNICOS', NULL, 0.20, 0.80, 50, 10, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K6', NULL),
('COMP-EEPROM-02', 'EEPROM 24C02 (256 bytes)', 'COMPONENTES ELETRÔNICOS', NULL, 0.30, 1.20, 30, 10, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K7', 'SOP-8'),
('COMP-EEPROM-64', 'EEPROM 24C64 (8KB)', 'COMPONENTES ELETRÔNICOS', NULL, 0.45, 1.80, 25, 8, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K7', 'SOP-8'),
('COMP-EEPROM-256', 'EEPROM 24C256 (32KB)', 'COMPONENTES ELETRÔNICOS', NULL, 0.60, 2.20, 20, 5, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K7', NULL),
('COMP-CI-AUDIO', 'CI amplificador áudio TPA3116', 'COMPONENTES ELETRÔNICOS', 'TI', 2.50, 8.00, 15, 5, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K8', NULL),
('COMP-CI-USB', 'CI controlador USB CH340G', 'COMPONENTES ELETRÔNICOS', NULL, 0.80, 3.00, 20, 5, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K8', NULL),
('COMP-FUSIVEL', 'Fusível SMD 2A', 'COMPONENTES ELETRÔNICOS', NULL, 0.10, 0.50, 100, 20, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K9', NULL),
('COMP-LED-SMD', 'LED SMD 0805 branco', 'COMPONENTES ELETRÔNICOS', NULL, 0.03, 0.15, 200, 50, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K9', NULL),
('COMP-BOBINA-10U', 'Indutor/bobina 10uH SMD', 'COMPONENTES ELETRÔNICOS', NULL, 0.15, 0.60, 80, 20, 'f7839743-2fcd-40c0-b835-e5652608f817', 'Gaveta K9', NULL),

-- ============================================
-- PRODUCTS - FERRAMENTAS
-- ============================================
('FERR-EST-SOLDA', 'Estação de solda digital 60W', 'FERRAMENTAS', 'Yihua', 180.00, 350.00, 2, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Bancada', '936D+'),
('FERR-EST-RETRAB', 'Estação retrabalho ar quente', 'FERRAMENTAS', 'Yihua', 320.00, 580.00, 1, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Bancada', '858D'),
('FERR-MULTI', 'Multímetro digital', 'FERRAMENTAS', 'Minipa', 85.00, 160.00, 2, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Bancada', 'ET-1110A'),
('FERR-FT-ASSM', 'Fonte de bancada assimétrica 30V 5A', 'FERRAMENTAS', 'Yihua', 250.00, 450.00, 1, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Bancada', 'PS-305D'),
('FERR-MICRO', 'Microscópio eletrônico USB 1000x', 'FERRAMENTAS', NULL, 65.00, 130.00, 1, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Bancada', NULL),
('FERR-PINCA-AE', 'Pinça antiestática ponta fina', 'FERRAMENTAS', 'Vetus', 12.00, 28.00, 4, 2, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M1', 'ESD-15'),
('FERR-MALHA-DS', 'Malha dessoldadora 2mm x 1.5m', 'FERRAMENTAS', NULL, 3.50, 10.00, 10, 5, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M2', NULL),
('FERR-FLUXO', 'Fluxo de solda pasta 50g', 'FERRAMENTAS', 'Amtech', 15.00, 35.00, 5, 2, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M2', 'NC-559-ASM'),
('FERR-SOLDA-FIO', 'Fio de solda estanho 0.5mm 100g', 'FERRAMENTAS', NULL, 18.00, 38.00, 6, 3, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M2', '63/37'),
('FERR-IPA', 'Álcool isopropílico 1L', 'FERRAMENTAS', NULL, 22.00, 45.00, 4, 2, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Prateleira M3', '99.8%'),
('FERR-LIMPA-CONT', 'Limpa contato spray 300ml', 'FERRAMENTAS', 'Contactec', 14.00, 30.00, 6, 3, '7e5d928a-ff2a-45a3-80f6-a2cb7e21a3e9', 'Prateleira M3', NULL),
('FERR-CHAVE-KIT', 'Kit chaves precisão 25 peças', 'FERRAMENTAS', NULL, 25.00, 55.00, 3, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M1', 'Torx, Phillips, pentalobe'),
('FERR-ESPATULA', 'Kit espátulas abertura celular', 'FERRAMENTAS', NULL, 8.00, 20.00, 5, 2, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M1', NULL),
('FERR-VENTOSA', 'Ventosa abertura tela', 'FERRAMENTAS', NULL, 3.00, 10.00, 6, 3, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M1', NULL),
('FERR-PULSEIRA-AE', 'Pulseira antiestática ajustável', 'FERRAMENTAS', NULL, 5.00, 15.00, 4, 2, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Gaveta M1', NULL),
('FERR-TAPETE-AE', 'Tapete antiestático bancada', 'FERRAMENTAS', NULL, 35.00, 75.00, 2, 1, '53dbb96c-0aad-44cc-950f-c28434e31bcd', 'Bancada', NULL),

-- ============================================
-- PRODUCTS - ACESSÓRIOS
-- ============================================
('ACES-PELICULA', 'Película vidro temperado universal', 'ACESSÓRIOS', NULL, 1.50, 8.00, 25, 10, '54aaca70-8ece-4336-9f12-946c5da29eae', 'Gaveta N1', NULL),
('ACES-CAPINHA', 'Capinha silicone transparente', 'ACESSÓRIOS', NULL, 2.00, 12.00, 20, 8, '54aaca70-8ece-4336-9f12-946c5da29eae', 'Gaveta N1', NULL),
('ACES-CABO-USBC', 'Cabo USB-C 1m', 'ACESSÓRIOS', NULL, 3.50, 15.00, 15, 5, '7e5d928a-ff2a-45a3-80f6-a2cb7e21a3e9', 'Gaveta N2', NULL),
('ACES-CABO-LIGHT', 'Cabo Lightning 1m', 'ACESSÓRIOS', NULL, 5.00, 20.00, 10, 5, '7e5d928a-ff2a-45a3-80f6-a2cb7e21a3e9', 'Gaveta N2', NULL),
('ACES-CARREG-20W', 'Carregador USB-C 20W', 'ACESSÓRIOS', NULL, 12.00, 35.00, 8, 3, '7e5d928a-ff2a-45a3-80f6-a2cb7e21a3e9', 'Gaveta N3', NULL);
