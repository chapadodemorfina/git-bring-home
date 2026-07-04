/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * PermissionGuard — Fase 3.5.
 *
 * Em `shadowOnly=true` (padrão nesta fase), NUNCA bloqueia; apenas calcula
 * se o usuário teria acesso e emite um `console.warn` em desenvolvimento
 * quando a permissão futura negaria acesso. Não substitui `RoleGuard`.
 *
 * Em `shadowOnly=false`, bloqueia fail-closed com fallback. Nesta fase o
 * modo bloqueante não deve ser usado em rotas de produção.
 */
import { useEffect, type ReactNode } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { usePermissionMap } from "../hooks/usePermissions";

export type PermissionGuardProps = {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  shadowOnly?: boolean;
  debugLabel?: string;
};

export function PermissionGuard({
  permission,
  anyOf,
  allOf,
  children,
  fallback,
  shadowOnly = true,
  debugLabel,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading, isError } =
    usePermissionMap();

  let wouldAllow = true;
  if (permission) wouldAllow = wouldAllow && hasPermission(permission);
  if (anyOf && anyOf.length > 0) wouldAllow = wouldAllow && hasAnyPermission(anyOf);
  if (allOf && allOf.length > 0) wouldAllow = wouldAllow && hasAllPermissions(allOf);

  useEffect(() => {
    if (!shadowOnly) return;
    if (isLoading) return;
    if (!wouldAllow && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        `[PermissionGuard:shadow] Acesso seria negado${debugLabel ? ` em ${debugLabel}` : ""}.`,
        { permission, anyOf, allOf, isError },
      );
    }
  }, [shadowOnly, wouldAllow, isLoading, isError, debugLabel, permission, anyOf, allOf]);

  if (shadowOnly) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!wouldAllow) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não possui a permissão necessária para acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default PermissionGuard;
