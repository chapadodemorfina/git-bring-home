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
  dashboard: [
    "admin",
    "manager",
    "finance",
    "front_desk",
    "bench_technician",
    "field_technician",
    "collection_point_operator",
    "customer",
  ],
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
