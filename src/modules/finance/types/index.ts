import { z } from "zod";

export type FinancialEntryType = "revenue" | "expense" | "commission";
export type FinancialEntryStatus = "pending" | "partial" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer" | "boleto" | "check" | "other";

export interface FinancialEntry {
  id: string;
  entry_type: FinancialEntryType;
  status: FinancialEntryStatus;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  service_order_id: string | null;
  quote_id: string | null;
  supplier_id: string | null;
  collection_point_id: string | null;
  customer_id: string | null;
  category: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customer_name?: string;
  supplier_name?: string;
  order_number?: string;
}

export interface Payment {
  id: string;
  financial_entry_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const entryTypeLabels: Record<FinancialEntryType, string> = {
  revenue: "Receita",
  expense: "Despesa",
  commission: "Comissão",
};

export const entryTypeColors: Record<FinancialEntryType, string> = {
  revenue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expense: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  commission: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const statusLabels: Record<FinancialEntryStatus, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const statusColors: Record<FinancialEntryStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  pix: "PIX",
  bank_transfer: "Transferência",
  boleto: "Boleto",
  check: "Cheque",
  other: "Outro",
};

export const revenueCategories = [
  "Serviço de Reparo",
  "Venda de Peças",
  "Taxa de Análise",
  "Outros",
];

export const expenseCategories = [
  "Compra de Peças",
  "Aluguel",
  "Salários",
  "Utilidades",
  "Marketing",
  "Transporte",
  "Ferramentas",
  "Outros",
];

export const financialEntryFormSchema = z.object({
  entry_type: z.enum(["revenue", "expense", "commission"]),
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  due_date: z.string().optional(),
  service_order_id: z.string().optional(),
  customer_id: z.string().optional(),
  supplier_id: z.string().optional(),
  collection_point_id: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export type FinancialEntryFormData = z.infer<typeof financialEntryFormSchema>;

export const paymentFormSchema = z.object({
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  payment_method: z.enum(["cash", "credit_card", "debit_card", "pix", "bank_transfer", "boleto", "check", "other"]),
  payment_date: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;
