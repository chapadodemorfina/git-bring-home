/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 *
 * Hooks para o painel de permissões configuráveis (Fase 3.4).
 * Consomem as RPCs já criadas no banco. Não fazem enforcement no front.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getActiveTenantId } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

export interface EffectivePermission {
  key: string;
  module: string;
  action: string;
  description: string | null;
  is_sensitive: boolean;
  via_roles: string[];
  from_role: boolean;
  override_effect: "allow" | "deny" | null;
  override_expires_at: string | null;
  override_reason: string | null;
  override_active: boolean;
  effective: boolean;
}

function extractRpcError(err: any): { code?: string; message: string } {
  const message = err?.message || String(err) || "Erro desconhecido";
  const code = err?.code || err?.details?.code;
  return { code, message };
}

export function useEffectivePermissions(targetUserId: string | undefined) {
  return useQuery<EffectivePermission[]>({
    queryKey: ["effective-permissions", targetUserId],
    enabled: !!targetUserId && !!getActiveTenantId(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_effective_permissions", {
        _target_user_id: targetUserId as string,
      });
      if (error) {
        const e: any = new Error(error.message);
        e.code = (error as any).code;
        throw e;
      }
      return (data as unknown as EffectivePermission[]) || [];
    },
  });
}

export function useMyPermissions() {
  // Depend on TenantContext so the query re-runs (and key changes) when
  // the active tenant is resolved or switched.
  const { activeTenant, loading: tenantLoading } = useTenant();
  const tenantId = activeTenant?.id ?? getActiveTenantId();
  return useQuery<string[]>({
    queryKey: ["my-permissions", tenantId],
    enabled: !!tenantId && !tenantLoading,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_permissions");
      if (error) throw new Error(error.message);
      return (data as string[]) || [];
    },
  });
}

/**
 * Mapa (Set) das permissões do usuário atual, com helpers convenientes.
 * Fail-closed: em erro ou durante loading, `hasPermission` retorna `false`.
 * `isLoading` também é true enquanto o tenant ativo ainda não foi resolvido,
 * para evitar flash de "Acesso negado" antes da query começar.
 */
export function usePermissionMap() {
  const query = useMyPermissions();
  const tenantId = getActiveTenantId();
  const permissions = query.data || [];
  const set = new Set(permissions);
  // Considera "carregando" também quando o tenant ainda não está pronto
  // (nesse caso a query fica com enabled=false e não emite isLoading).
  const isLoading = !tenantId || query.isLoading || query.fetchStatus === "fetching" || (query.isPending && !query.isError);
  const ready = !isLoading && !query.isError;

  const hasPermission = (key: string): boolean => {
    if (!ready) return false;
    return set.has(key);
  };
  const hasAnyPermission = (keys: string[]): boolean => {
    if (!ready) return false;
    return keys.some((k) => set.has(k));
  };
  const hasAllPermissions = (keys: string[]): boolean => {
    if (!ready) return false;
    return keys.every((k) => set.has(k));
  };

  return {
    permissions,
    isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

/**
 * Verifica uma permissão específica do usuário atual.
 * Fail-closed em loading e erro.
 */
export function useHasPermission(permissionKey: string) {
  const { hasPermission, isLoading, isError, error } = usePermissionMap();
  return {
    allowed: hasPermission(permissionKey),
    isLoading,
    isError,
    error,
  };
}

/**
 * Verifica se o usuário atual tem ao menos uma das permissões.
 * Fail-closed em loading e erro.
 */
export function useHasAnyPermission(permissionKeys: string[]) {
  const { hasAnyPermission, isLoading, isError, error } = usePermissionMap();
  return {
    allowed: hasAnyPermission(permissionKeys),
    isLoading,
    isError,
    error,
  };
}

interface SetOverrideParams {
  targetUserId: string;
  permissionKey: string;
  effect: "allow" | "deny";
  reason: string;
  expiresAt?: string | null;
}

export function useSetUserPermissionOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ targetUserId, permissionKey, effect, reason, expiresAt }: SetOverrideParams) => {
      const { data, error } = await supabase.rpc("set_user_permission_override", {
        _target_user_id: targetUserId,
        _permission_key: permissionKey,
        _effect: effect,
        _reason: reason,
        _expires_at: expiresAt || undefined,
      });
      if (error) {
        const { message } = extractRpcError(error);
        throw new Error(message);
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["effective-permissions", vars.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
      toast({ title: "Permissão atualizada" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao alterar permissão", description: err.message, variant: "destructive" });
    },
  });
}

interface ClearOverrideParams {
  targetUserId: string;
  permissionKey: string;
  reason: string;
}

export function useClearUserPermissionOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ targetUserId, permissionKey, reason }: ClearOverrideParams) => {
      const { data, error } = await supabase.rpc("clear_user_permission_override", {
        _target_user_id: targetUserId,
        _permission_key: permissionKey,
        _reason: reason,
      });
      if (error) {
        const { message } = extractRpcError(error);
        throw new Error(message);
      }
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["effective-permissions", vars.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
      toast({ title: "Override removido" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao limpar override", description: err.message, variant: "destructive" });
    },
  });
}
