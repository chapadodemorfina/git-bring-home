import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export function useWhatsAppConversations(statusFilter?: string) {
  return useQuery({
    queryKey: ["wa-conversations", statusFilter],
    queryFn: async () => {
      let query = db
        .from("whatsapp_conversations")
        .select("*, customers(full_name)")
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map((d: any) => ({
        ...d,
        customer_name: d.customers?.full_name || null,
        customers: undefined,
      }));
    },
    refetchInterval: 10000,
  });
}

export function useWhatsAppConversation(id: string | undefined) {
  return useQuery({
    queryKey: ["wa-conversation", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("whatsapp_conversations")
        .select("*, customers(full_name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return { ...data, customer_name: data.customers?.full_name || null };
    },
  });
}

export function useWhatsAppMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["wa-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await db
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 5000,
  });
}

export function useWhatsAppHandoffs(statusFilter?: string) {
  return useQuery({
    queryKey: ["wa-handoffs", statusFilter],
    queryFn: async () => {
      let query = db
        .from("whatsapp_handoffs")
        .select("*, whatsapp_conversations(phone, customer_id, customers(full_name))")
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 10000,
  });
}

export function useWhatsAppAiActions(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["wa-ai-actions", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await db
        .from("whatsapp_ai_actions")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSendHumanReply() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      // Call the whatsapp-send edge function for actual delivery
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { conversation_id: conversationId, text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["wa-messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      const delivery = data?.delivery;
      if (delivery?.mode === "dev_fallback") {
        toast({ title: "Mensagem salva (modo dev)", description: "Provedor WhatsApp não configurado. Mensagem armazenada localmente." });
      } else {
        toast({ title: "Mensagem enviada!" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    },
  });
}

export function useResolveConversation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await db.from("whatsapp_conversations")
        .update({ status: "resolved", current_handoff_state: null })
        .eq("id", conversationId);

      await db.from("whatsapp_handoffs")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .in("status", ["pending", "assigned", "active"]);

      // Clear any pending states
      await db.from("whatsapp_pending_states")
        .delete()
        .eq("conversation_id", conversationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      qc.invalidateQueries({ queryKey: ["wa-handoffs"] });
      toast({ title: "Conversa resolvida!" });
    },
  });
}

export function useAssignHandoff() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ handoffId, conversationId }: { handoffId: string; conversationId: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await db.from("whatsapp_handoffs")
        .update({ status: "active", assigned_to_user_id: userId, started_at: new Date().toISOString() })
        .eq("id", handoffId);
      await db.from("whatsapp_conversations")
        .update({ status: "human_active", assigned_to_user_id: userId, current_handoff_state: "active" })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      qc.invalidateQueries({ queryKey: ["wa-handoffs"] });
      toast({ title: "Atendimento assumido!" });
    },
  });
}
