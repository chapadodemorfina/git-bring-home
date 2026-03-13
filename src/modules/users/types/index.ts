/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */

export type AppRole = "admin" | "manager" | "front_desk" | "bench_technician" | "field_technician" | "finance" | "collection_point_operator" | "customer";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: AppRole[];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: AppRole;
}

export interface UpdateUserPayload {
  user_id: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  roles?: AppRole[];
}

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  manager: "Gerente",
  front_desk: "Recepção",
  bench_technician: "Técnico de Bancada",
  field_technician: "Técnico de Campo",
  finance: "Financeiro",
  collection_point_operator: "Operador Ponto de Coleta",
  customer: "Cliente",
};

export const roleBadgeVariants: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "destructive",
  manager: "default",
  front_desk: "secondary",
  bench_technician: "outline",
  field_technician: "outline",
  finance: "secondary",
  collection_point_operator: "secondary",
  customer: "outline",
};
