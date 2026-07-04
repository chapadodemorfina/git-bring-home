/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * ROUTE_PERMISSIONS — Fase 3.5 / 3.5.2.
 *
 * Mapeamento paralelo a `ROUTE_ROLES` que descreve, para cada rota/módulo,
 * quais permissões seriam exigidas (`anyOf` por padrão), além de metadados
 * de segurança que orientam a migração para `PermissionGuard`.
 *
 * IMPORTANTE:
 *   - Este arquivo NÃO substitui `RoleGuard`.
 *   - Enforcement continua sendo `RoleGuard` + `ROUTE_ROLES`.
 *   - `PermissionGuard` bloqueante só é aplicado em rotas-piloto
 *     (`tech`, `serviceOrders`) e sempre em modo AND com `RoleGuard`.
 *   - Rotas marcadas como `requiresRoleFloor` NÃO devem ser migradas
 *     para permissão pura — o piso por role permanece obrigatório.
 *   - Chaves aqui devem existir em `public.permissions`.
 */

export type PermissionKey = string;

/**
 * Modo de enforcement para uma rota/módulo:
 *   - `shadow`       — PermissionGuard em `shadowOnly=true`, não bloqueia.
 *   - `blocking-and` — PermissionGuard bloqueia em AND com RoleGuard.
 *   - `role-only`    — apenas RoleGuard; PermissionGuard não aplicado.
 */
export type RoutePermissionMode = "shadow" | "blocking-and" | "role-only";

export interface RoutePermissionRule {
  /** Ao menos uma destas permissões concede acesso. */
  anyOf: readonly PermissionKey[];
  /** Todas estas permissões são exigidas (opcional). */
  allOf?: readonly PermissionKey[];
  /**
   * Se `true`, o piso por role via `RoleGuard`/`ROUTE_ROLES` é obrigatório e
   * a rota NÃO pode ser migrada para permissão pura, mesmo que a permissão
   * seja concedida via override.
   */
  requiresRoleFloor?: boolean;
  /** Rota/módulo sensível — exige revisão manual antes de qualquer migração. */
  sensitive?: boolean;
  /** Modo de enforcement atual desta rota. */
  mode?: RoutePermissionMode;
  /** Notas livres para o diagnóstico e futura auditoria. */
  notes?: string;
}

/**
 * Chaves alinhadas com `ROUTE_ROLES` em `src/lib/permissions.ts`.
 */
export const ROUTE_PERMISSIONS = {
  dashboard: {
    anyOf: ["dashboard.view"],
    requiresRoleFloor: true,
    mode: "shadow",
  },
  operation: {
    anyOf: ["operation.view", "service_orders.view"],
    mode: "shadow",
  },
  // Correção 3.5.2: removido `users.view` — amplo demais para o módulo de cadastros.
  registrations: {
    anyOf: ["customers.view", "devices.view"],
    mode: "shadow",
  },
  stock: { anyOf: ["inventory.view"], mode: "shadow" },
  commercial: { anyOf: ["sales.view", "quotes.view"], mode: "shadow" },
  financial: {
    anyOf: ["financial.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },
  commissionsHub: {
    anyOf: ["commissions.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },
  communication: { anyOf: ["messaging.view"], mode: "shadow" },
  adminHub: {
    anyOf: ["settings.view", "permissions.view", "users.view", "audit.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
    notes: "Escopo amplo demais para PermissionGuard puro; manter piso por role.",
  },
  pdv: { anyOf: ["pdv.operate"], mode: "shadow" },

  // Sub-rotas
  sales: { anyOf: ["sales.create"], mode: "shadow" },
  salesRead: {
    anyOf: ["sales.view"],
    mode: "role-only",
    notes:
      "bench_technician tem sales.view no seed; migração para permissão pura ampliaria acesso. Decisão pendente.",
  },
  quotes: {
    anyOf: ["quotes.view"],
    mode: "role-only",
    notes:
      "finance tem quotes.view no seed; migração para permissão pura ampliaria acesso. Decisão pendente.",
  },
  warranties: {
    anyOf: ["warranties.view"],
    mode: "blocking-and",
    notes: "Fase 3.5.4: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  customers: {
    anyOf: ["customers.view"],
    mode: "blocking-and",
    notes: "Fase 3.5.4: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  devices: {
    anyOf: ["devices.view"],
    mode: "blocking-and",
    notes: "Fase 3.5.4: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  // Piloto blocking-and — aplicado em AND com RoleGuard nas rotas /service-orders/*.
  serviceOrders: {
    anyOf: ["service_orders.view"],
    mode: "blocking-and",
    notes: "Piloto 3.5.2: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  inventory: {
    anyOf: ["inventory.view"],
    mode: "blocking-and",
    notes: "Fase 3.5.5: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  logistics: {
    anyOf: ["logistics.view"],
    mode: "blocking-and",
    notes: "Fase 3.5.5: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  finance: {
    anyOf: ["financial.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },

  // Portais
  // Piloto blocking-and — aplicado em AND com RoleGuard em /tech e sub-rotas.
  tech: {
    anyOf: ["tech.view"],
    mode: "blocking-and",
    notes: "Piloto 3.5.2: PermissionGuard bloqueante em AND com RoleGuard.",
  },
  portal: { anyOf: ["portal.view"], mode: "shadow" },
  partner: { anyOf: ["partner.view"], mode: "shadow" },

  // Painéis administrativos específicos
  permissionsPage: {
    anyOf: ["permissions.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "shadow",
  },
  usersPage: {
    anyOf: ["users.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },
  auditPage: {
    anyOf: ["audit.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },
  settingsPage: {
    anyOf: ["settings.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },
  collectionPoints: { anyOf: ["collection_points.view"], mode: "shadow" },
  cpCommissions: {
    anyOf: ["commissions.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "role-only",
  },

  // Aba de equipe dentro de /registrations — escopo restrito, exige piso por role.
  // Ainda não referenciada em UI; disponível para uso futuro.
  registrationsTeamTab: {
    anyOf: ["users.view"],
    requiresRoleFloor: true,
    sensitive: true,
    mode: "shadow",
    notes: "Aba de equipe do módulo de cadastros. Não aplicado em UI ainda.",
  },
} as const satisfies Record<string, RoutePermissionRule>;

export type RoutePermissionKey = keyof typeof ROUTE_PERMISSIONS;
