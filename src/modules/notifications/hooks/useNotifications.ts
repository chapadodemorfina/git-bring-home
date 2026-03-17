import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery, type PaginationParams } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";

const db = supabase as any;
// ---- Rules ----
export function useNotificationRules() {
  return useQuery({
    queryKey: ["notification-rules"],
    queryFn: async () => {
      const { data, error } = await db
        .from("notification_rules")
        .select("*, notification_templates(name, template_key)")
        .order("event_type");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.from("notification_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-rules"] });
      toast({ title: "Regra atualizada!" });
    },
  });
}

// ---- Templates ----
export function useNotificationTemplates() {
  return useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const { data, error } = await db
        .from("notification_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await db.from("notification_templates").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
      toast({ title: "Template atualizado!" });
    },
  });
}

// ---- Queue ----
export function useNotificationQueue(filters?: { status?: string; channel?: string }) {
  return useQuery({
    queryKey: ["notification-queue", filters],
    queryFn: async () => {
      let query = db
        .from("notification_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.channel) query = query.eq("channel", filters.channel);

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });
}

export function useNotificationQueuePaginated(filters?: { status?: string; channel?: string }, page: number = 1) {
  return useQuery<PaginatedResult<any>>({
    queryKey: ["notification-queue-paginated", filters, page],
    queryFn: async () => {
      const params: PaginationParams = { page };
      return executePaginatedQuery<any>(params, {
        table: "notification_queue",
        select: "*",
        defaultSort: { column: "created_at", ascending: false },
        additionalFilters: (q: any) => {
          let query = q;
          if (filters?.status) query = query.eq("status", filters.status);
          if (filters?.channel) query = query.eq("channel", filters.channel);
          return query;
        },
        countFilters: (q: any) => {
          let query = q;
          if (filters?.status) query = query.eq("status", filters.status);
          if (filters?.channel) query = query.eq("channel", filters.channel);
          return query;
        },
      });
    },
    refetchInterval: 15000,
  });
}

export function useRetryNotification() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("notification_queue")
        .update({ status: "pending", next_attempt_at: new Date().toISOString(), error_message: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-queue"] });
      toast({ title: "Notificação reenfileirada!" });
    },
  });
}

// ---- Logs ----
export function useNotificationLogs(queueId?: string) {
  return useQuery({
    queryKey: ["notification-logs", queueId],
    queryFn: async () => {
      let query = db
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (queueId) query = query.eq("queue_id", queueId);

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}
