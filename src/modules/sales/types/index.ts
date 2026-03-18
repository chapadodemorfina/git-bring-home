export type SaleStatus = "draft" | "completed" | "cancelled" | "partially_refunded" | "refunded";
export type SalePaymentStatus = "pending" | "partial" | "paid" | "refunded" | "cancelled";
export type SalePaymentMethod = "cash" | "pix" | "credit_card" | "debit_card" | "bank_transfer" | "other";

export interface Sale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  seller_user_id: string;
  status: SaleStatus;
  subtotal: number;
  discount_amount: number;
  surcharge_amount: number;
  total_amount: number;
  payment_status: SalePaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  // joined
  customer_name?: string | null;
  seller_name?: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  sku_snapshot: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  cost_price_snapshot: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  payment_method: SalePaymentMethod;
  amount: number;
  installments: number | null;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

export interface SaleReturn {
  id: string;
  sale_id: string;
  sale_item_id: string | null;
  product_id: string | null;
  quantity: number;
  amount_refunded: number;
  reason: string;
  returned_at: string;
  processed_by: string | null;
  created_at: string;
}

export interface SaleFormItem {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  available_stock: number;
}

export const saleStatusLabels: Record<SaleStatus, string> = {
  draft: "Rascunho",
  completed: "Concluída",
  cancelled: "Cancelada",
  partially_refunded: "Dev. Parcial",
  refunded: "Devolvida",
};

export const saleStatusColors: Record<SaleStatus, string> = {
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  partially_refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const paymentStatusLabels: Record<SalePaymentStatus, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  refunded: "Estornado",
  cancelled: "Cancelado",
};

export const paymentMethodLabels: Record<SalePaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  bank_transfer: "Transferência",
  other: "Outro",
};
