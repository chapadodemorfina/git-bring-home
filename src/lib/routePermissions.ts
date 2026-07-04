/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * ROUTE_PERMISSIONS — Fase 3.5.
 *
 * Mapeamento paralelo a `ROUTE_ROLES` que descreve, para cada rota/módulo,
 * quais permissões seriam exigidas no futuro (`anyOf` por padrão).
 *
 * IMPORTANTE:
 *   - Este arquivo NÃO é usado como enforcement.
 *   - Enforcement continua sendo `RoleGuard` + `ROUTE_ROLES`.
 *   - Serve para `PermissionGuard` em modo `shadowOnly` e para o
 *     diagnóstico de divergência role vs permissão.
 *   - Chaves aqui devem existir em `public.permissions` (tabela do banco).
 */

export type PermissionKey = string;

export interface RoutePermissionRule {
  /** Ao menos uma destas permissões concede acesso. */
  anyOf: PermissionKey[];
  /** Descrição livre para o diagnóstico. */
  description?: string;
}

/**
 * Chaves alinhadas com `ROUTE_ROLES` em `src/lib/permissions.ts`.
 * Cada chave abaixo corresponde a um agrupamento de rotas já
 * protegido por `RoleGuard`.
 */
export const ROUTE_PERMISSIONS = {
  dashboard: { anyOf: ["dashboard.view"] },
  operation: { anyOf: ["operation.view", "service_orders.view"] },
  registrations: { anyOf: ["customers.view", "devices.view", "users.view"] },
  stock: { anyOf: ["inventory.view"] },
  commercial: { anyOf: ["sales.view", "quotes.view"] },
  financial: { anyOf: ["financial.view"] },
  commissionsHub: { anyOf: ["commissions.view"] },
  communication: { anyOf: ["messaging.view"] },
  adminHub: { anyOf: ["settings.view", "permissions.view", "users.view", "audit.view"] },
  pdv: { anyOf: ["pdv.operate"] },

  // Sub-rotas
  sales: { anyOf: ["sales.create"] },
  salesRead: { anyOf: ["sales.view"] },
  quotes: { anyOf: ["quotes.view"] },
  warranties: { anyOf: ["warranties.view"] },
  customers: { anyOf: ["customers.view"] },
  devices: { anyOf: ["devices.view"] },
  serviceOrders: { anyOf: ["service_orders.view"] },
  inventory: { anyOf: ["inventory.view"] },
  logistics: { anyOf: ["logistics.view"] },
  finance: { anyOf: ["financial.view"] },

  // Portais
  tech: { anyOf: ["tech.view"] },
  portal: { anyOf: ["portal.view"] },
  partner: { anyOf: ["partner.view"] },

  // Painéis administrativos específicos
  permissionsPage: { anyOf: ["permissions.view"] },
  usersPage: { anyOf: ["users.view"] },
  auditPage: { anyOf: ["audit.view"] },
  settingsPage: { anyOf: ["settings.view"] },
  collectionPoints: { anyOf: ["collection_points.view"] },
  cpCommissions: { anyOf: ["commissions.view"] },
} as const satisfies Record<string, RoutePermissionRule>;

export type RoutePermissionKey = keyof typeof ROUTE_PERMISSIONS;
