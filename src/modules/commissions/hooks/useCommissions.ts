import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";
import type {
  CommissionRule, CommissionEntry, CommissionEntryStatus,
} from "../types";

const db = supabase as any;

// ── Rules ──

export function useCommissionRules() {
  return useQuery<CommissionRule[]>({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data, error } = await db
        .from("commission_rules")
        .select("*")
        .order("role")
        .order("source_type");
      if (error) throw error;
      return data as CommissionRule[];
    },
  });
}

export function useCreateCommissionRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: Partial<CommissionRule>) => {
      const { data, error } = await db.from("commission_rules").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rules"] });
      toast({ title: "Regra criada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCommissionRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CommissionRule> }) => {
      const { error } = await db.from("commission_rules").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rules"] });
      toast({ title: "Regra atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCommissionRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("commission_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rules"] });
      toast({ title: "Regra removida!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Entries (paginated) ──

export function useCommissionEntries(
  page: number = 1,
  filters?: {
    status?: CommissionEntryStatus | null;
    userId?: string | null;
    role?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  },
) {
  return useQuery<PaginatedResult<CommissionEntry>>({
    queryKey: ["commission-entries", page, filters],
    queryFn: async () => {
      return executePaginatedQuery<any>(
        { page },
        {
          table: "commission_entries",
          select: "*, profiles!commission_entries_user_id_fkey(full_name)",
          defaultSort: { column: "reference_date", ascending: false },
          additionalFilters: (q: any) => {
            let query = q;
            if (filters?.status) query = query.eq("status", filters.status);
            if (filters?.userId) query = query.eq("user_id", filters.userId);
            if (filters?.role) query = query.eq("role", filters.role);
            if (filters?.dateFrom) query = query.gte("reference_date", filters.dateFrom);
            if (filters?.dateTo) query = query.lte("reference_date", filters.dateTo);
            return query;
          },
          countFilters: (q: any) => {
            let query = q;
            if (filters?.status) query = query.eq("status", filters.status);
            if (filters?.userId) query = query.eq("user_id", filters.userId);
            if (filters?.role) query = query.eq("role", filters.role);
            if (filters?.dateFrom) query = query.gte("reference_date", filters.dateFrom);
            if (filters?.dateTo) query = query.lte("reference_date", filters.dateTo);
            return query;
          },
        }
      ).then((result) => ({
        ...result,
        items: result.items.map((e: any) => ({
          ...e,
          user_name: e.profiles?.full_name || null,
          profiles: undefined,
        })),
      }));
    },
  });
}

// ── Summary ──

export function useCommissionSummary(dateFrom?: string | null, dateTo?: string | null) {
  return useQuery({
    queryKey: ["commission-summary", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await db.rpc("commission_summary", {
        _from: dateFrom || null,
        _to: dateTo || null,
      });
      if (error) throw error;
      return (data || {
        total_pending: 0, total_approved: 0, total_paid: 0,
        total_cancelled: 0, total_month: 0,
        count_pending: 0, count_approved: 0, count_paid: 0,
      }) as {
        total_pending: number; total_approved: number; total_paid: number;
        total_cancelled: number; total_month: number;
        count_pending: number; count_approved: number; count_paid: number;
      };
    },
  });
}

// ── Actions ──

export function useUpdateCommissionStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CommissionEntryStatus }) => {
      const payload: any = { status };
      if (status === "paid") payload.paid_at = new Date().toISOString();
      const { error } = await db.from("commission_entries").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-entries"] });
      qc.invalidateQueries({ queryKey: ["commission-summary"] });
      toast({ title: "Comissão atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Generate commissions (manual trigger) ──

export function useGenerateSaleCommissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await db.rpc("generate_sale_commissions", { _sale_id: saleId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["commission-entries"] });
      qc.invalidateQueries({ queryKey: ["commission-summary"] });
      if (count > 0) toast({ title: `${count} comissão(ões) gerada(s)!` });
    },
    onError: (e: any) => toast({ title: "Erro ao gerar comissões", description: e.message, variant: "destructive" }),
  });
}

export function useGenerateSOCommissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (soId: string) => {
      const { data, error } = await db.rpc("generate_so_commissions", { _so_id: soId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["commission-entries"] });
      qc.invalidateQueries({ queryKey: ["commission-summary"] });
      if (count > 0) toast({ title: `${count} comissão(ões) gerada(s)!` });
    },
    onError: (e: any) => toast({ title: "Erro ao gerar comissões", description: e.message, variant: "destructive" }),
  });
}
