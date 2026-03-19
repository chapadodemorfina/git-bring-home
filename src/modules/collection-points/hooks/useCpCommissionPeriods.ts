import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery, type PaginationParams } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";

const db = supabase as any;

export interface CpCommissionPeriod {
  id: string;
  tenant_id: string;
  collection_point_id: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  commission_amount: number;
  status: "pending" | "approved" | "paid";
  financial_entry_id: string | null;
  created_at: string;
  updated_at: string;
  collection_points?: { name: string } | null;
}

export function useCpCommissionPeriods(
  status?: string,
  periodStart?: string,
  periodEnd?: string,
  page: number = 1
) {
  return useQuery<PaginatedResult<CpCommissionPeriod>>({
    queryKey: ["cp-commission-periods", status, periodStart, periodEnd, page],
    queryFn: async () => {
      const params: PaginationParams = { page };
      return executePaginatedQuery<CpCommissionPeriod>(params, {
        table: "cp_commission_periods",
        select: "*, collection_points(name)",
        defaultSort: { column: "period_start", ascending: false },
        additionalFilters: (q: any) => {
          let query = q;
          if (status && status !== "all") query = query.eq("status", status);
          if (periodStart) query = query.gte("period_start", periodStart);
          if (periodEnd) query = query.lte("period_end", periodEnd);
          return query;
        },
        countFilters: (q: any) => {
          let query = q;
          if (status && status !== "all") query = query.eq("status", status);
          if (periodStart) query = query.gte("period_start", periodStart);
          if (periodEnd) query = query.lte("period_end", periodEnd);
          return query;
        },
      });
    },
  });
}

export function useGenerateCpCommissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { periodStart: string; periodEnd: string; cpId?: string }) => {
      const { data, error } = await db.rpc("generate_cp_commissions", {
        _period_start: params.periodStart,
        _period_end: params.periodEnd,
        _cp_id: params.cpId || null,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["cp-commission-periods"] });
      toast({ title: count > 0 ? `${count} comissão(ões) gerada(s)` : "Nenhuma comissão nova para gerar" });
    },
    onError: (e: any) => toast({ title: "Erro ao gerar", description: e.message, variant: "destructive" }),
  });
}

export function useApproveCpCommission() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("approve_cp_commission", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cp-commission-periods"] });
      toast({ title: "Comissão aprovada e lançamento financeiro criado" });
    },
    onError: (e: any) => toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" }),
  });
}

export function usePayCpCommission() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; method: string }) => {
      const { error } = await db.rpc("pay_cp_commission", { _id: params.id, _method: params.method });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cp-commission-periods"] });
      toast({ title: "Comissão paga com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao pagar", description: e.message, variant: "destructive" }),
  });
}
