import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";
import type { AccountReceivable, ReceivablePayment, ReceivableStatus } from "../types";

const db = supabase as any;

export function useReceivablesPaginated(
  status?: ReceivableStatus | null,
  search?: string,
  overdueOnly?: boolean,
  page: number = 1,
) {
  return useQuery<PaginatedResult<AccountReceivable>>({
    queryKey: ["receivables-paginated", status, search, overdueOnly, page],
    queryFn: async () => {
      const { data, error } = await db.rpc("search_receivables", {
        _search: search || null,
        _status: status || null,
        _overdue_only: overdueOnly || false,
        _page: page,
        _page_size: 25,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      return {
        items: (result.items || []) as AccountReceivable[],
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    },
  });
}

export function useReceivable(id: string | undefined) {
  return useQuery({
    queryKey: ["receivable", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("accounts_receivable")
        .select("*, customers(full_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return { ...data, customer_name: data.customers?.full_name, customers: undefined } as AccountReceivable;
    },
  });
}

export function useReceivablePayments(receivableId: string | undefined) {
  return useQuery({
    queryKey: ["receivable-payments", receivableId],
    enabled: !!receivableId,
    queryFn: async () => {
      const { data, error } = await db
        .from("receivable_payments")
        .select("*")
        .eq("receivable_id", receivableId!)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data as ReceivablePayment[];
    },
  });
}

export function useReceivablesSummary() {
  return useQuery({
    queryKey: ["receivables-summary"],
    queryFn: async () => {
      const defaults = {
        total_receivable: 0, total_overdue: 0, overdue_count: 0,
        received_month: 0, open_count: 0, total_count: 0,
      };
      const { data, error } = await db.rpc("receivables_summary");
      if (error) throw error;
      return { ...defaults, ...data } as typeof defaults;
    },
  });
}

export function useCreateReceivable() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: Partial<AccountReceivable>) => {
      const { data, error } = await db.from("accounts_receivable").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables-paginated"] });
      qc.invalidateQueries({ queryKey: ["receivables-summary"] });
      toast({ title: "Conta a receber criada!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useRegisterReceivablePayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ receivableId, amount, paymentMethod, notes }: {
      receivableId: string; amount: number; paymentMethod: string; notes?: string;
    }) => {
      const { data, error } = await db.rpc("register_receivable_payment", {
        _receivable_id: receivableId,
        _amount: amount,
        _payment_method: paymentMethod,
        _notes: notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["receivables-paginated"] });
      qc.invalidateQueries({ queryKey: ["receivables-summary"] });
      qc.invalidateQueries({ queryKey: ["receivable", vars.receivableId] });
      qc.invalidateQueries({ queryKey: ["receivable-payments", vars.receivableId] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: "Pagamento registrado!" });
    },
    onError: (e: Error) => toast({ title: "Erro ao registrar pagamento", description: e.message, variant: "destructive" }),
  });
}

export function useCancelReceivable() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("accounts_receivable").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receivables-paginated"] });
      qc.invalidateQueries({ queryKey: ["receivables-summary"] });
      toast({ title: "Conta cancelada!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
