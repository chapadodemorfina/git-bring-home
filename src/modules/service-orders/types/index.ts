import { z } from "zod";

export type ServiceOrderStatus =
  | "received" | "triage" | "awaiting_diagnosis" | "awaiting_quote"
  | "awaiting_customer_approval" | "awaiting_parts" | "in_repair"
  | "in_testing" | "ready_for_pickup" | "delivered" | "cancelled" | "warranty_return";

export const statusLabels: Record<ServiceOrderStatus, string> = {
  received: "Recebido",
  triage: "Triagem",
  awaiting_diagnosis: "Aguardando Diagnóstico",
  awaiting_quote: "Aguardando Orçamento",
  awaiting_customer_approval: "Aguardando Aprovação",
  awaiting_parts: "Aguardando Peças",
  in_repair: "Em Reparo",
  in_testing: "Em Teste",
  ready_for_pickup: "Pronto p/ Retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  warranty_return: "Retorno Garantia",
};

export const statusColors: Record<ServiceOrderStatus, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  triage: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  awaiting_diagnosis: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  awaiting_quote: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  awaiting_customer_approval: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  awaiting_parts: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  in_repair: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  in_testing: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  ready_for_pickup: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  warranty_return: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
};

export type ServiceOrderPriority = "low" | "normal" | "high" | "urgent";

export const priorityLabels: Record<ServiceOrderPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const priorityColors: Record<ServiceOrderPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export type IntakeChannel = "front_desk" | "collection_point" | "whatsapp" | "phone" | "email" | "website";

export const channelLabels: Record<IntakeChannel, string> = {
  front_desk: "Balcão",
  collection_point: "Ponto de Coleta",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  email: "E-mail",
  website: "Website",
};

// ----- Structured Checklist Types -----

export interface ChecklistItem {
  id: string;
  label: string;
  status: "ok" | "damaged" | "not_working" | "scratched" | "cracked" | "missing" | "not_tested" | "na";
  notes?: string;
}

export const intakeChecklistTemplate: ChecklistItem[] = [
  { id: "power_on", label: "Aparelho liga?", status: "not_tested" },
  { id: "screen", label: "Tela quebrada?", status: "not_tested" },
  { id: "body", label: "Carcaça avariada?", status: "not_tested" },
  { id: "buttons", label: "Botões funcionando?", status: "not_tested" },
  { id: "camera", label: "Câmera funcionando?", status: "not_tested" },
  { id: "sim_card", label: "Com chip?", status: "not_tested" },
  { id: "memory_card", label: "Com cartão de memória?", status: "not_tested" },
  { id: "charger", label: "Com carregador?", status: "not_tested" },
  { id: "biometrics", label: "Biometria funcionando?", status: "not_tested" },
  { id: "speakers", label: "Alto-falantes funcionando?", status: "not_tested" },
];

export const deliveryChecklistTemplate: ChecklistItem[] = [
  { id: "tested", label: "Aparelho testado?", status: "not_tested" },
  { id: "working", label: "Entregue funcionando?", status: "not_tested" },
  { id: "screen_ok", label: "Tela OK?", status: "not_tested" },
  { id: "buttons_ok", label: "Botões OK?", status: "not_tested" },
  { id: "camera_ok", label: "Câmera OK?", status: "not_tested" },
  { id: "no_pending", label: "Sem pendências?", status: "not_tested" },
];

export const checklistStatusLabels: Record<ChecklistItem["status"], string> = {
  ok: "OK",
  damaged: "Danificado",
  not_working: "Não funciona",
  scratched: "Arranhado",
  cracked: "Trincado",
  missing: "Ausente",
  not_tested: "Não testado",
  na: "N/A",
};

export const checklistStatusColors: Record<ChecklistItem["status"], string> = {
  ok: "bg-green-500",
  damaged: "bg-red-500",
  not_working: "bg-red-500",
  scratched: "bg-yellow-500",
  cracked: "bg-orange-500",
  missing: "bg-red-400",
  not_tested: "bg-muted-foreground",
  na: "bg-muted-foreground",
};

// ----- Service Order Interface -----

export interface ServiceOrder {
  id: string;
  order_number: string;
  customer_id: string;
  device_id: string | null;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  intake_channel: IntakeChannel;
  collection_point_id: string | null;
  reported_issue: string | null;
  physical_condition: string | null;
  accessories_received: string | null;
  intake_notes: string | null;
  internal_notes: string | null;
  expected_deadline: string | null;
  estimated_value: number | null;
  total_amount: number;
  intake_checklist: ChecklistItem[] | null;
  delivery_checklist: ChecklistItem[] | null;
  assigned_technician_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customer_name?: string;
  customer_phone?: string | null;
  customer_document?: string | null;
  device_label?: string;
  device_type?: string | null;
  device_serial?: string | null;
  device_imei?: string | null;
  device_color?: string | null;
  device_brand?: string | null;
  device_model?: string | null;
  collection_point_name?: string | null;
  technician_name?: string;
}

export interface StatusHistoryEntry {
  id: string;
  service_order_id: string;
  from_status: ServiceOrderStatus | null;
  to_status: ServiceOrderStatus;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
  changed_by_name?: string;
}

export interface ServiceOrderSignature {
  id: string;
  service_order_id: string;
  signer_name: string;
  signer_role: string;
  signature_data: string;
  ip_address: string | null;
  created_at: string;
}

export interface ServiceOrderAttachment {
  id: string;
  service_order_id: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ServiceOrderTerm {
  id: string;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export const serviceOrderSchema = z.object({
  customer_id: z.string().uuid("Selecione um cliente"),
  device_id: z.string().uuid("Selecione um dispositivo").optional().or(z.literal("")),
  priority: z.enum(["low", "normal", "high", "urgent"] as const),
  intake_channel: z.enum(["front_desk", "collection_point", "whatsapp", "phone", "email", "website"] as const),
  reported_issue: z.string().trim().max(2000).optional().or(z.literal("")),
  physical_condition: z.string().trim().max(2000).optional().or(z.literal("")),
  accessories_received: z.string().trim().max(2000).optional().or(z.literal("")),
  intake_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  internal_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  expected_deadline: z.string().optional().or(z.literal("")),
  assigned_technician_id: z.string().uuid().optional().or(z.literal("")),
  estimated_value: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0, "Valor não pode ser negativo").max(999999999999, "Valor muito alto").nullable()
  ),
});

export type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>;

// Status flow — which transitions are valid
export const statusTransitions: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  received: ["triage", "cancelled"],
  triage: ["awaiting_diagnosis", "cancelled"],
  awaiting_diagnosis: ["awaiting_quote", "in_repair", "cancelled"],
  awaiting_quote: ["awaiting_customer_approval", "cancelled"],
  awaiting_customer_approval: ["awaiting_parts", "in_repair", "cancelled"],
  awaiting_parts: ["in_repair", "cancelled"],
  in_repair: ["in_testing", "awaiting_parts", "cancelled"],
  in_testing: ["ready_for_pickup", "in_repair", "cancelled"],
  ready_for_pickup: ["delivered"],
  delivered: ["warranty_return"],
  cancelled: [],
  warranty_return: ["triage"],
};
