import { z } from "zod";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  compatible_devices: string | null;
  cost_price: number;
  sale_price: number;
  quantity: number;
  minimum_quantity: number;
  supplier_id: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  products?: { name: string; sku: string } | null;
}

export interface PurchaseEntry {
  id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  total_amount: number;
  notes: string | null;
  received_at: string;
  created_by: string | null;
  created_at: string;
  suppliers?: Supplier | null;
}

export interface RepairPartUsed {
  id: string;
  service_order_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_price: number;
  notes: string | null;
  consumed_by: string | null;
  created_at: string;
  products?: { name: string; sku: string } | null;
}

export type StockMovementType = "entry" | "exit" | "adjustment" | "return" | "reserved" | "consumed";

export const movementTypeLabels: Record<StockMovementType, string> = {
  entry: "Entrada",
  exit: "Saída",
  adjustment: "Ajuste",
  return: "Devolução",
  reserved: "Reserva",
  consumed: "Consumo",
};

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU obrigatório").max(50),
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  compatible_devices: z.string().trim().max(500).optional().or(z.literal("")),
  cost_price: z.coerce.number().min(0, "Preço deve ser >= 0"),
  sale_price: z.coerce.number().min(0, "Preço deve ser >= 0"),
  quantity: z.coerce.number().int().min(0),
  minimum_quantity: z.coerce.number().int().min(0),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  contact_name: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export const stockEntrySchema = z.object({
  product_id: z.string().uuid("Selecione um produto"),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima: 1"),
  unit_cost: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type StockEntryFormData = z.infer<typeof stockEntrySchema>;

export const consumePartSchema = z.object({
  product_id: z.string().uuid("Selecione uma peça"),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima: 1"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ConsumePartFormData = z.infer<typeof consumePartSchema>;

export const productCategories = [
  "Tela / Display",
  "Bateria",
  "Conector / Porta",
  "Placa-mãe",
  "Memória RAM",
  "Armazenamento",
  "Cooler / Ventoinha",
  "Fonte de Alimentação",
  "Cabo / Flex",
  "Carcaça / Gabinete",
  "Teclado",
  "Outro",
];
