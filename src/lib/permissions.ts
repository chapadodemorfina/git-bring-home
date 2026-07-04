/**
 * Matriz canônica de permissões — Fase 1 (front-end apenas).
 * Fonte única para Sidebar e RoleGuard.
 * NÃO substitui RLS/policies do banco.
 */

export type AppRole =
  | "admin"
  | "manager"
  | "front_desk"
  | "bench_technician"
  | "field_technician"
  | "finance"
  | "collection_point_operator"
  | "customer";

export const ROLES = {
  admin: "admin",
  manager: "manager",
  front_desk: "front_desk",
  bench_technician: "bench_technician",
  field_technician: "field_technician",
  finance: "finance",
  cp_operator: "collection_point_operator",
  customer: "customer",
} as const;

/** Roles permitidos para cada rota / módulo. */
export const ROUTE_ROLES = {
  dashboard: ["admin", "manager", "finance"],
  operation: ["admin", "manager", "front_desk", "bench_technician", "field_technician"],
  registrations: ["admin", "manager", "front_desk", "finance", "bench_technician"],
  stock: ["admin", "manager", "bench_technician", "front_desk"],
  commercial: ["admin", "manager", "front_desk", "finance", "bench_technician"],
  financial: ["admin", "manager", "finance"],
  commissionsHub: ["admin", "manager", "finance"],
  communication: ["admin", "manager", "front_desk"],
  adminHub: ["admin", "manager"],
  pdv: ["admin", "manager", "front_desk"],

  // Sub-rotas
  sales: ["admin", "manager", "front_desk"],
  salesRead: ["admin", "manager", "front_desk", "finance"],
  quotes: ["admin", "manager", "front_desk", "bench_technician"],
  warranties: ["admin", "manager", "front_desk", "bench_technician", "finance"],
  customers: ["admin", "manager", "front_desk", "finance", "bench_technician"],
  devices: ["admin", "manager", "front_desk", "bench_technician"],
  serviceOrders: ["admin", "manager", "front_desk", "bench_technician", "field_technician"],
  inventory: ["admin", "manager", "bench_technician", "front_desk"],
  logistics: ["admin", "manager", "bench_technician", "front_desk"],
  finance: ["admin", "manager", "finance"],

  // Portais
  tech: ["admin", "manager", "bench_technician", "field_technician"],
  portal: ["customer"],
  partner: ["collection_point_operator"],
} satisfies Record<string, AppRole[]>;

/** Sidebar principal (app interno). */
export interface SidebarModule {
  key: keyof typeof ROUTE_ROLES;
  title: string;
  url: string;
}

/**
 * Rota inicial (home) por role.
 * Fail-closed: role desconhecida ou ausente → `/login`.
 */
export function getDefaultRouteForRole(role: AppRole | string | null | undefined): string {
  switch (role) {
    case "admin":
    case "manager":
    case "finance":
      return "/dashboard";
    case "front_desk":
      return "/operation";
    case "bench_technician":
    case "field_technician":
      return "/tech";
    case "collection_point_operator":
      return "/partner";
    case "customer":
      return "/portal";
    default:
      return "/login";
  }
}

/**
 * Escolhe a melhor rota destino a partir de uma lista de roles do usuário.
 * Prioriza roles mais privilegiadas.
 */
const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "manager",
  "finance",
  "front_desk",
  "bench_technician",
  "field_technician",
  "collection_point_operator",
  "customer",
];

export function getDefaultRouteForRoles(roles: readonly string[] | null | undefined): string {
  if (!Array.isArray(roles) || roles.length === 0) return "/login";
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return getDefaultRouteForRole(r);
  }
  return "/login";
}

