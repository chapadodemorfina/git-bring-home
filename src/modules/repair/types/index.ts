import { z } from "zod";

export interface RepairService {
  id: string;
  service_order_id: string;
  action_type: string;
  description: string;
  technician_id: string | null;
  time_spent_minutes: number | null;
  created_at: string;
}

export interface RepairTest {
  id: string;
  service_order_id: string;
  test_name: string;
  passed: boolean | null;
  notes: string | null;
  tested_by: string | null;
  tested_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface Warranty {
  id: string;
  service_order_id: string;
  warranty_number: string;
  warranty_type: string;
  customer_id: string | null;
  quote_id: string | null;
  start_date: string;
  end_date: string;
  coverage_description: string | null;
  terms: string | null;
  is_void: boolean;
  void_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarrantyItem {
  id: string;
  warranty_id: string;
  item_type: "part" | "service";
  reference_id: string | null;
  description: string;
  quantity: number;
  created_at: string;
}

export interface WarrantyReturn {
  id: string;
  warranty_id: string;
  original_service_order_id: string;
  new_service_order_id: string | null;
  customer_id: string | null;
  reason: string;
  return_cause: string | null;
  technical_analysis: string | null;
  outcome: string | null;
  status: string;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarrantyRule {
  id: string;
  name: string;
  device_type: string | null;
  service_category: string | null;
  warranty_days: number;
  applies_to: string;
  is_active: boolean;
  created_at: string;
}

export const repairServiceSchema = z.object({
  action_type: z.enum(["note", "repair", "replacement", "cleaning", "firmware", "other"] as const),
  description: z.string().trim().min(1, "Descrição obrigatória").max(2000),
  time_spent_minutes: z.coerce.number().min(0).optional(),
});

export type RepairServiceFormData = z.infer<typeof repairServiceSchema>;

export const actionTypeLabels: Record<string, string> = {
  note: "Anotação",
  repair: "Reparo",
  replacement: "Substituição",
  cleaning: "Limpeza",
  firmware: "Firmware/Software",
  other: "Outro",
};

export const defaultTests = [
  "Liga corretamente",
  "Imagem OK",
  "Áudio OK",
  "Carregamento OK",
  "Temperatura OK",
  "Portas/Conexões OK",
  "Wi-Fi/Bluetooth OK",
  "Teclado/Touch OK",
  "Teste de estresse OK",
];

export const warrantyReturnSchema = z.object({
  reason: z.string().trim().min(1, "Motivo obrigatório").max(2000),
});

export type WarrantyReturnFormData = z.infer<typeof warrantyReturnSchema>;

export const warrantyTypeLabels: Record<string, string> = {
  service: "Serviço",
  part: "Peças",
  mixed: "Misto",
  repair_warranty: "Reparo",
};

export const returnOutcomeLabels: Record<string, string> = {
  pending: "Pendente",
  covered: "Coberto",
  not_covered: "Não Coberto",
  partial: "Parcial",
};

export const returnStatusLabels: Record<string, string> = {
  open: "Aberto",
  in_analysis: "Em Análise",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

export const returnCauses = [
  { value: "same_issue", label: "Mesmo defeito" },
  { value: "different_issue", label: "Defeito diferente" },
  { value: "misuse", label: "Mau uso" },
  { value: "water_damage", label: "Dano por líquido" },
  { value: "physical_damage", label: "Dano físico" },
  { value: "manufacturing_defect", label: "Defeito de fabricação" },
];
