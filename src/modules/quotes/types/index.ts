import { z } from "zod";

export type CommercialQuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired" | "cancelled";
export type QuoteItemType = "part" | "labor" | "service" | "other";

export const quoteStatusLabels: Record<CommercialQuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export const quoteStatusColors: Record<CommercialQuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export const itemTypeLabels: Record<QuoteItemType, string> = {
  part: "Peça",
  labor: "Mão de Obra",
  service: "Serviço",
  other: "Outro",
};

export interface CommercialQuote {
  id: string;
  customer_id: string | null;
  device_id: string | null;
  service_order_id: string | null;
  quote_number: string;
  title: string;
  description: string | null;
  subtotal_parts: number;
  subtotal_labor: number;
  subtotal_other: number;
  discount_amount: number;
  total_amount: number;
  total_cost: number;
  estimated_profit: number;
  status: CommercialQuoteStatus;
  valid_until: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customers?: { full_name: string } | null;
  service_orders?: { order_number: string } | null;
}

export interface CommercialQuoteItem {
  id: string;
  quote_id: string;
  item_type: QuoteItemType;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_price: number;
  profit_amount: number;
  created_at: string;
}

export interface QuoteHistoryEntry {
  id: string;
  quote_id: string;
  action: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface QuotesSummary {
  total: number;
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
  expired: number;
  cancelled: number;
  total_approved_value: number;
  total_rejected_value: number;
  total_estimated_profit: number;
  approval_rate: number;
  avg_approval_days: number;
}

export const quoteFormSchema = z.object({
  customer_id: z.string().min(1, "Cliente obrigatório"),
  device_id: z.string().optional().or(z.literal("")),
  service_order_id: z.string().optional().or(z.literal("")),
  title: z.string().min(1, "Título obrigatório").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  valid_until: z.string().optional().or(z.literal("")),
  discount_amount: z.coerce.number().min(0).default(0),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;

export const quoteItemFormSchema = z.object({
  item_type: z.enum(["part", "labor", "service", "other"] as const),
  product_id: z.string().optional().or(z.literal("")),
  description: z.string().min(1, "Descrição obrigatória").max(500),
  quantity: z.coerce.number().min(0.01, "Quantidade inválida"),
  unit_cost: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0, "Preço inválido"),
});

export type QuoteItemFormData = z.infer<typeof quoteItemFormSchema>;
