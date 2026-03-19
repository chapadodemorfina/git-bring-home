import { z } from "zod";

export interface CollectionPointSettings {
  create_customers: boolean;
  edit_customers: boolean;
  create_service_orders: boolean;
  view_only_own_orders: boolean;
  view_quotes: boolean;
  approve_quotes: boolean;
  upload_attachments: boolean;
  view_status: boolean;
  view_financial: boolean;
  close_orders: boolean;
  cancel_orders: boolean;
}

export const defaultCpSettings: CollectionPointSettings = {
  create_customers: true,
  edit_customers: false,
  create_service_orders: true,
  view_only_own_orders: true,
  view_quotes: true,
  approve_quotes: false,
  upload_attachments: true,
  view_status: true,
  view_financial: false,
  close_orders: false,
  cancel_orders: false,
};

export const cpSettingLabels: Record<keyof CollectionPointSettings, string> = {
  create_customers: "Criar Clientes",
  edit_customers: "Editar Clientes",
  create_service_orders: "Criar Ordens de Serviço",
  view_only_own_orders: "Ver Apenas Próprias OS",
  view_quotes: "Visualizar Orçamentos",
  approve_quotes: "Aprovar Orçamentos",
  upload_attachments: "Enviar Anexos",
  view_status: "Ver Status da OS",
  view_financial: "Ver Financeiro",
  close_orders: "Finalizar OS",
  cancel_orders: "Cancelar OS",
};

export interface CollectionPoint {
  id: string;
  name: string;
  company_name: string | null;
  responsible_person: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  commission_type: CommissionType;
  commission_value: number;
  settings: CollectionPointSettings;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionPointUser {
  id: string;
  collection_point_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

export interface CollectionTransfer {
  id: string;
  service_order_id: string;
  collection_point_id: string;
  status: TransferStatus;
  direction: string;
  transferred_by: string | null;
  received_by: string | null;
  transferred_at: string | null;
  received_at: string | null;
  tracking_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  service_orders?: { order_number: string; status: string } | null;
  collection_points?: { name: string } | null;
}

export interface CollectionPointCommission {
  id: string;
  collection_point_id: string;
  service_order_id: string;
  commission_type: CommissionType;
  commission_value: number;
  base_amount: number;
  calculated_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  service_orders?: { order_number: string } | null;
}

export type CommissionType = "percentage" | "fixed_per_order" | "fixed_per_device";
export type TransferStatus =
  | "pending_pickup"
  | "in_transit_to_center"
  | "received_at_center"
  | "in_transit_to_collection_point"
  | "delivered_to_collection_point"
  | "delivered_to_customer";

export const commissionTypeLabels: Record<CommissionType, string> = {
  percentage: "Percentual",
  fixed_per_order: "Fixo por OS",
  fixed_per_device: "Fixo por Dispositivo",
};

export const transferStatusLabels: Record<TransferStatus, string> = {
  pending_pickup: "Aguardando Coleta",
  in_transit_to_center: "Em Trânsito → Centro",
  received_at_center: "Recebido no Centro",
  in_transit_to_collection_point: "Em Trânsito → Ponto de Coleta",
  delivered_to_collection_point: "Entregue no Ponto de Coleta",
  delivered_to_customer: "Entregue ao Cliente",
};

export const transferStatusFlow: Record<string, TransferStatus[]> = {
  to_center: ["pending_pickup", "in_transit_to_center", "received_at_center"],
  to_collection_point: ["in_transit_to_collection_point", "delivered_to_collection_point"],
  to_customer: ["delivered_to_customer"],
};

export const collectionPointSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  company_name: z.string().trim().max(200).optional().or(z.literal("")),
  responsible_person: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  number: z.string().trim().max(20).optional().or(z.literal("")),
  complement: z.string().trim().max(100).optional().or(z.literal("")),
  neighborhood: z.string().trim().max(100).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
  zip_code: z.string().trim().max(10).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  commission_type: z.enum(["percentage", "fixed_per_order", "fixed_per_device"] as const),
  commission_value: z.coerce.number().min(0, "Valor deve ser >= 0"),
});

export type CollectionPointFormData = z.infer<typeof collectionPointSchema>;

export const transferSchema = z.object({
  status: z.string().min(1, "Status obrigatório"),
  tracking_code: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TransferFormData = z.infer<typeof transferSchema>;

export const brazilianStates = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
