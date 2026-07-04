/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * Fase 3.4 — Painel de permissões por usuário (read + overrides).
 * Ainda não é enforcement: RoleGuard/ROUTE_ROLES continuam ativos.
 */
import { useMemo, useState } from "react";
import { ShieldCheck, Search, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsersList } from "@/modules/users/hooks/useUsers";
import { roleLabels, type AppRole } from "@/modules/users/types";
import {
  useEffectivePermissions,
  useSetUserPermissionOverride,
  useClearUserPermissionOverride,
  type EffectivePermission,
} from "../hooks/usePermissions";
import { PermissionDivergenceDiagnostic } from "../components/PermissionDivergenceDiagnostic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  operation: "Operação",
  service_orders: "Ordens de Serviço",
  sales: "Vendas",
  quotes: "Orçamentos",
  warranties: "Garantias",
  customers: "Clientes",
  devices: "Dispositivos",
  inventory: "Estoque",
  logistics: "Logística",
  finance: "Financeiro",
  financial: "Financeiro",
  cash_register: "Caixa",
  commissions: "Comissões",
  users: "Usuários",
  settings: "Configurações",
  permissions: "Permissões",
  reports: "Relatórios",
  audit: "Auditoria",
  messaging: "Mensageria",
  notifications: "Notificações",
  portal: "Portal do Cliente",
  partner: "Portal Parceiro",
};

type PendingAction =
  | { kind: "set"; effect: "allow" | "deny"; perm: EffectivePermission }
  | { kind: "clear"; perm: EffectivePermission };

export default function PermissionsManagementPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading: usersLoading, error: usersError } = useUsersList();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const filteredUsers = useMemo(() => {
    const list = users || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const selectedUser = useMemo(
    () => (users || []).find((u) => u.id === selectedUserId),
    [users, selectedUserId],
  );

  const isSelf = !!selectedUser && !!currentUser && selectedUser.id === currentUser.id;

  const {
    data: permissions,
    isLoading: permsLoading,
    error: permsError,
  } = useEffectivePermissions(selectedUserId);

  const setOverride = useSetUserPermissionOverride();
  const clearOverride = useClearUserPermissionOverride();

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const grouped = useMemo(() => {
    const map: Record<string, EffectivePermission[]> = {};
    (permissions || []).forEach((p) => {
      const m = p.module || "outros";
      (map[m] = map[m] || []).push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const openAction = (action: PendingAction) => {
    setReason("");
    setExpiresAt("");
    setPending(action);
  };

  const confirmAction = async () => {
    if (!pending || !selectedUserId) return;
    if (!reason.trim()) return;
    try {
      if (pending.kind === "set") {
        await setOverride.mutateAsync({
          targetUserId: selectedUserId,
          permissionKey: pending.perm.key,
          effect: pending.effect,
          reason: reason.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
      } else {
        await clearOverride.mutateAsync({
          targetUserId: selectedUserId,
          permissionKey: pending.perm.key,
          reason: reason.trim(),
        });
      }
      setPending(null);
    } catch {
      /* toast já exibido */
    }
  };

  const permsErrorMsg = (permsError as any)?.message as string | undefined;
  const isAccessDenied = permsErrorMsg?.toLowerCase().includes("permission denied");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Permissões de Usuários</h1>
          <p className="text-sm text-muted-foreground">
            As alterações ficam registradas e serão usadas pelo sistema de permissões configuráveis.
            As rotas atuais ainda seguem as regras por perfil até a próxima etapa.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* Lista de usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {usersError ? (
              <div className="p-4 text-sm text-destructive">Erro ao carregar usuários.</div>
            ) : usersLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[560px]">
                <div className="divide-y">
                  {filteredUsers.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
                  )}
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-muted ${
                        selectedUserId === u.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        {!u.is_active && (
                          <Badge variant="outline" className="shrink-0">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(u.roles || []).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {roleLabels[r as AppRole] || r}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Painel do usuário */}
        <div className="space-y-4">
          {!selectedUser ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Selecione um usuário para visualizar suas permissões efetivas.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedUser.full_name}</CardTitle>
                  <CardDescription>
                    {selectedUser.email} •{" "}
                    {(selectedUser.roles || [])
                      .map((r) => roleLabels[r as AppRole] || r)
                      .join(", ") || "sem role"}{" "}
                    • {selectedUser.is_active ? "Ativo" : "Inativo"}
                  </CardDescription>
                </CardHeader>
                {isSelf && (
                  <CardContent>
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Ação não permitida</AlertTitle>
                      <AlertDescription>
                        Você não pode alterar suas próprias permissões.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>

              {isAccessDenied ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Acesso negado</AlertTitle>
                  <AlertDescription>
                    Você não tem permissão para visualizar permissões efetivas.
                  </AlertDescription>
                </Alert>
              ) : permsError ? (
                <Alert variant="destructive">
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{permsErrorMsg}</AlertDescription>
                </Alert>
              ) : permsLoading ? (
                <Card>
                  <CardContent className="space-y-2 p-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </CardContent>
                </Card>
              ) : (permissions || []).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Nenhuma permissão encontrada.
                  </CardContent>
                </Card>
              ) : (
                grouped.map(([mod, list]) => (
                  <Card key={mod}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {MODULE_LABELS[mod] || mod}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {list.map((p) => (
                        <PermissionRow
                          key={p.key}
                          perm={p}
                          disabled={isSelf}
                          busy={setOverride.isPending || clearOverride.isPending}
                          onAllow={() => openAction({ kind: "set", effect: "allow", perm: p })}
                          onDeny={() => openAction({ kind: "set", effect: "deny", perm: p })}
                          onClear={() => openAction({ kind: "clear", perm: p })}
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}

              {selectedUser && !isAccessDenied && (
                <PermissionDivergenceDiagnostic
                  userId={selectedUser.id}
                  userLabel={selectedUser.full_name || selectedUser.email || ""}
                  userRoles={(selectedUser.roles || []) as string[]}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === "clear"
                ? "Remover override"
                : pending?.kind === "set" && pending.effect === "allow"
                  ? "Permitir permissão"
                  : "Negar permissão"}
            </DialogTitle>
            <DialogDescription>
              {pending && (
                <>
                  <span className="font-mono">{pending.perm.key}</span>
                  {" • "}
                  {selectedUser?.full_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {pending?.perm.is_sensitive && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Permissão sensível</AlertTitle>
              <AlertDescription>
                Esta permissão é sensível. Apenas administradores podem alterá-la.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="reason">Motivo *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo desta alteração"
              />
            </div>
            {pending?.kind === "set" && (
              <div>
                <Label htmlFor="expires">Expiração (opcional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              disabled={!reason.trim() || setOverride.isPending || clearOverride.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RowProps {
  perm: EffectivePermission;
  disabled: boolean;
  busy: boolean;
  onAllow: () => void;
  onDeny: () => void;
  onClear: () => void;
}

function PermissionRow({ perm, disabled, busy, onAllow, onDeny, onClear }: RowProps) {
  const overrideLabel =
    perm.override_active && perm.override_effect === "allow"
      ? "Override: allow"
      : perm.override_active && perm.override_effect === "deny"
        ? "Override: deny"
        : "Sem override";

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs">{perm.key}</span>
          {perm.is_sensitive && <Badge variant="destructive">Sensível</Badge>}
          <Badge variant={perm.effective ? "default" : "outline"}>
            {perm.effective ? "Permitido" : "Bloqueado"}
          </Badge>
          {perm.from_role && (
            <Badge variant="secondary" className="text-[10px]">
              via role: {perm.via_roles.join(", ")}
            </Badge>
          )}
          {perm.override_active && (
            <Badge
              variant={perm.override_effect === "allow" ? "default" : "destructive"}
              className="text-[10px]"
            >
              {overrideLabel}
            </Badge>
          )}
        </div>
        {perm.description && (
          <p className="mt-1 text-xs text-muted-foreground">{perm.description}</p>
        )}
        {perm.override_active && (
          <p className="mt-1 text-xs text-muted-foreground">
            {perm.override_reason ? `Motivo: ${perm.override_reason}` : null}
            {perm.override_expires_at
              ? ` • Expira em ${new Date(perm.override_expires_at).toLocaleString("pt-BR")}`
              : ""}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={disabled || busy} onClick={onAllow}>
          Permitir
        </Button>
        <Button size="sm" variant="outline" disabled={disabled || busy} onClick={onDeny}>
          Negar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled || busy || !perm.override_active}
          onClick={onClear}
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
