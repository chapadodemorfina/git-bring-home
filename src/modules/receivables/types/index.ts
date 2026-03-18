export type ReceivableStatus = "pending" | "partial" | "paid" | "overdue" | "cancelled";
export type ReceivableReferenceType = "sale" | "service_order" | "manual";

export interface AccountReceivable {
  id: string;
  customer_id: string | null;
  reference_type: ReceivableReferenceType;
  reference_id: string | null;
  description: string;
  total_amount: number;
  amount_received: number;
  remaining_amount: number;
  due_date: string | null;
  status: ReceivableStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customer_name?: string;
}

export interface ReceivablePayment {
  id: string;
  receivable_id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const receivableStatusLabels: Record<ReceivableStatus, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const receivableStatusColors: Record<ReceivableStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  partial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export const referenceTypeLabels: Record<ReceivableReferenceType, string> = {
  sale: "Venda",
  service_order: "Ordem de Serviço",
  manual: "Manual",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  pix: "PIX",
  bank_transfer: "Transferência",
  boleto: "Boleto",
  check: "Cheque",
  other: "Outro",
};
