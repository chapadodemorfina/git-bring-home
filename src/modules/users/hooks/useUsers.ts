/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserProfile, CreateUserPayload, UpdateUserPayload } from "../types";

async function callAdminUsers(action: string, payload: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const res = await supabase.functions.invoke("admin-users", {
    body: { action, ...payload },
  });

  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export function useUsersList() {
  return useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const data = await callAdminUsers("list_users");
      return data.users;
    },
  });
}

export function useUserDetail(userId: string | undefined) {
  return useQuery<UserProfile>({
    queryKey: ["admin-users", userId],
    queryFn: () => callAdminUsers("get_user", { user_id: userId }),
    enabled: !!userId,
  });
}

export function useTechniciansList() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const data = await callAdminUsers("list_technicians");
      return data.technicians as { id: string; full_name: string; email: string; phone: string | null; is_active: boolean }[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => callAdminUsers("create_user", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuário criado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => callAdminUsers("update_user", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuário atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => callAdminUsers("deactivate_user", { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuário desativado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao desativar", description: err.message, variant: "destructive" });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => callAdminUsers("activate_user", { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuário reativado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao reativar", description: err.message, variant: "destructive" });
    },
  });
}

export function useResetPasswordEmail() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (email: string) => callAdminUsers("reset_password_email", { email }),
    onSuccess: () => {
      toast({ title: "Email de redefinição enviado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar email", description: err.message, variant: "destructive" });
    },
  });
}

export function useResetPasswordManual() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: { user_id: string; new_password: string }) =>
      callAdminUsers("reset_password_manual", payload),
    onSuccess: () => {
      toast({ title: "Senha redefinida com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao redefinir senha", description: err.message, variant: "destructive" });
    },
  });
}
