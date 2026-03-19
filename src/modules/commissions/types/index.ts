export type CommissionEntryStatus = "pending" | "approved" | "paid" | "cancelled";
export type CommissionSourceType = "sale" | "service_order";
export type CommissionBaseType = "total_amount" | "labor_cost" | "fixed_per_unit" | "net_amount" | "profit" | "received_amount";

export interface CommissionRule {
  id: string;
  role: string;
  label: string;
  source_type: CommissionSourceType;
  base_type: CommissionBaseType;
  percentage: number;
  fixed_amount: number;
  is_active: boolean;
  notes: string | null;
  product_id: string | null;
  category_filter: string | null;
  only_after_payment: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommissionEntry {
  id: string;
  user_id: string;
  rule_id: string | null;
  role: string;
  source_type: CommissionSourceType;
  source_id: string;
  source_label: string | null;
  base_amount: number;
  commission_amount: number;
  status: CommissionEntryStatus;
  reference_date: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface SalesGoal {
  id: string;
  tenant_id: string;
  user_id: string | null;
  team_role: string | null;
  goal_type: "revenue" | "quantity" | "ticket_avg";
  target_value: number;
  period_start: string;
  period_end: string;
  label: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface GoalProgress {
  goal_id: string;
  label: string;
  goal_type: string;
  target: number;
  actual: number;
  percentage: number;
  user_id: string | null;
  team_role: string | null;
  period_start: string;
  period_end: string;
}

export const statusLabels: Record<CommissionEntryStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  paid: "Paga",
  cancelled: "Cancelada",
};

export const statusColors: Record<CommissionEntryStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-muted text-muted-foreground",
};

export const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  front_desk: "Recepção",
  bench_technician: "Técnico Bancada",
  field_technician: "Técnico Campo",
  finance: "Financeiro",
  collection_point_operator: "Operador Ponto",
};

export const sourceTypeLabels: Record<CommissionSourceType, string> = {
  sale: "Venda",
  service_order: "Ordem de Serviço",
};

export const baseTypeLabels: Record<CommissionBaseType, string> = {
  total_amount: "Valor Total (Bruto)",
  net_amount: "Valor Líquido",
  profit: "Lucro",
  received_amount: "Pagamento Recebido",
  labor_cost: "Mão de Obra",
  fixed_per_unit: "Valor Fixo",
};

export const goalTypeLabels: Record<string, string> = {
  revenue: "Faturamento",
  quantity: "Quantidade de Vendas",
  ticket_avg: "Ticket Médio",
};
