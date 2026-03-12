
-- 1. Fix invalid SKU prefix: DK- → DESK-
UPDATE products SET sku = 'DESK-BIOS-PRE' WHERE id = '63fd8978-b17a-4675-ba62-59c2cd6ab83e';
UPDATE products SET sku = 'DESK-CABO-24PIN' WHERE id = 'b9e28d2b-7038-44d2-a023-1b98c4728ee5';
UPDATE products SET sku = 'DESK-CABO-PWRSATA' WHERE id = '28e7ff43-bc4c-4e40-90c4-da3c1d7dcee7';
UPDATE products SET sku = 'DESK-CABO-SATA' WHERE id = 'c94df2af-a652-4365-a30c-c32e316868bf';
UPDATE products SET sku = 'DESK-FAN-120' WHERE id = '63894f0e-86c6-4467-a217-a98f5539ccc8';
UPDATE products SET sku = 'DESK-FAN-80' WHERE id = 'fb1beef1-b990-41d0-b330-081994662a46';
UPDATE products SET sku = 'DESK-PASTA-TERM' WHERE id = 'e1fface8-9af7-4237-b63d-d9e589e573bb';
UPDATE products SET sku = 'DESK-PILHA-CR2032' WHERE id = '66e0c28b-59b5-4887-9918-acb665fab933';

-- 2. Fix generic names (9 items)
UPDATE products SET name = 'Auricular universal smartphone 10x15mm' WHERE id = 'b5a0d46f-a710-4e29-a9ab-c91ac9735748';
UPDATE products SET name = 'Carcaça base inferior notebook 15.6" universal' WHERE id = '33d6c34e-fcb4-4972-a8de-0aa4c1f72afd';
UPDATE products SET name = 'Carcaça tampa LCD notebook 15.6" universal' WHERE id = '655bd530-a1d8-4faa-81d1-faa153254734';
UPDATE products SET name = 'Conector carga USB-C SMD 12 pinos universal' WHERE id = 'ee9de408-f2ce-438e-abed-831b25e82e34';
UPDATE products SET name = 'Cooler ventoinha notebook 5V DC universal' WHERE id = 'a1afd9c0-c3f7-4129-88e0-20aac73e81ce';
UPDATE products SET name = 'Flex power/volume iPhone 7/8 compatível' WHERE id = '2890fd1b-57cf-4bb5-858a-83fd38f7fa83';
UPDATE products SET name = 'Flex power/volume Samsung Galaxy A/J/M compatível' WHERE id = '88510c56-6494-45d2-b288-f0f956babc96';
UPDATE products SET name = 'Fonte monitor LED 12V 3A universal' WHERE id = 'bcc01bfe-d7e0-4d65-8b08-d9300bfd436e';
UPDATE products SET name = 'Placa T-CON monitor LED universal HV320/HV430' WHERE id = 'bc86ba72-c9fb-4ab8-bba2-996df8548824';
