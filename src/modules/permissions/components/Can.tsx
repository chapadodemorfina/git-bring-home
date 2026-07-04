/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * <Can> — Fase 3.5.
 *
 * Componente de renderização condicional por permissão.
 * Fail-closed: durante loading ou erro, não libera acesso.
 * NÃO substitui gates server-side (RLS/RPCs).
 */
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { usePermissionMap } from "../hooks/usePermissions";

export type CanProps = {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  mode?: "hide" | "disable";
};

export function Can({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
  loadingFallback = null,
  mode = "hide",
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissionMap();

  if (isLoading) return <>{loadingFallback}</>;

  let allowed = true;
  if (permission) allowed = allowed && hasPermission(permission);
  if (anyOf && anyOf.length > 0) allowed = allowed && hasAnyPermission(anyOf);
  if (allOf && allOf.length > 0) allowed = allowed && hasAllPermissions(allOf);

  if (allowed) return <>{children}</>;

  if (mode === "disable" && isValidElement(children)) {
    // Só clona se for elemento simples e aceitar `disabled`.
    const el = children as ReactElement<any>;
    const props: any = el.props || {};
    if ("disabled" in props || typeof props.onClick !== "undefined") {
      return cloneElement(el, {
        ...props,
        disabled: true,
        onClick: undefined,
        "aria-disabled": true,
      });
    }
    return <>{fallback}</>;
  }

  return <>{fallback}</>;
}

export default Can;
