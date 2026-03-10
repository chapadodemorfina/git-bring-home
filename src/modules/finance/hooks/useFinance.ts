import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FinancialEntry, FinancialEntryFormData, Payment, PaymentFormData,
  FinancialEntryType, FinancialEntryStatus,
} from "../types";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

// ── Financial Entries ──

export function useFinancialEntries(
  entryType?: FinancialEntryType | null,
  status?: FinancialEntryStatus | null,
  search?: string,
) {
  return useQuery({
    queryKey: ["financial-entries", entryType, status, search],
    queryFn: async () => {
      let query = db
        .from("financial_entries")
        .select("*, customers(full_name), suppliers(name), service_orders(order_number)")
        .order("created_at", { ascending: false });

      if (entryType) query = query.eq("entry_type", entryType);
      if (status) query = query.eq("status", status);
      if (search) {
        query = query.or(
          `description.ilike.%${search}%,category.ilike.%${search}%,notes.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      let results = (data as any[]).map((d) => ({
        ...d,
        customer_name: d.customers?.full_name,
        supplier_name: d.suppliers?.name,
        order_number: d.service_orders?.order_number,
        customers: undefined,
        suppliers: undefined,
        service_orders: undefined,
      })) as FinancialEntry[];

      // Client-side filter for joined fields
      if (search) {
        const lower = search.toLowerCase();
        results = results.filter(r =>
          r.description?.toLowerCase().includes(lower) ||
          r.category?.toLowerCase().includes(lower) ||
          (r as any).customer_name?.toLowerCase().includes(lower) ||
          (r as any).supplier_name?.toLowerCase().includes(lower) ||
          (r as any).order_number?.toLowerCase().includes(lower)
        );
      }

      return results;
    },
  });
}

export function useFinancialEntry(id: string | undefined) {
  return useQuery({
    queryKey: ["financial-entry", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("*, customers(full_name), suppliers(name), service_orders(order_number)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return {
        ...data,
        customer_name: data.customers?.full_name,
        supplier_name: data.suppliers?.name,
        order_number: data.service_orders?.order_number,
        customers: undefined,
        suppliers: undefined,
        service_orders: undefined,
      } as FinancialEntry;
    },
  });
}

export function useCreateFinancialEntry() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FinancialEntryFormData) => {
      const payload: any = { ...formData };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
      });

      const { data, error } = await db.from("financial_entries").insert(payload).select().single();
      if (error) throw error;
      return data as FinancialEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: "Lançamento criado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar lançamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateFinancialEntry() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FinancialEntryFormData & { status: FinancialEntryStatus }> }) => {
      const payload: any = { ...data };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
      });

      const { data: updated, error } = await db.from("financial_entries").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return updated as FinancialEntry;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["financial-entry", vars.id] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: "Lançamento atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteFinancialEntry() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: "Lançamento removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });
}

// ── Payments (ATOMIC via RPC) ──

export function usePayments(entryId: string | undefined) {
  return useQuery({
    queryKey: ["payments", entryId],
    enabled: !!entryId,
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("*")
        .eq("financial_entry_id", entryId!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: PaymentFormData }) => {
      const { data: result, error } = await db.rpc("register_payment", {
        _financial_entry_id: entryId,
        _amount: data.amount,
        _payment_method: data.payment_method,
        _payment_date: data.payment_date || new Date().toISOString(),
        _reference: data.reference || null,
        _notes: data.notes || null,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payments", vars.entryId] });
      qc.invalidateQueries({ queryKey: ["financial-entry", vars.entryId] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: "Pagamento registrado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar pagamento", description: error.message, variant: "destructive" });
    },
  });
}

// ── Dashboard Summary (via RPC) ──

export function useFinanceSummary() {
  return useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const { data, error } = await db.rpc("finance_summary");
      if (error) throw error;
      return data as {
        total_revenue: number;
        total_expenses: number;
        total_commissions: number;
        pending_receivables: number;
        pending_payables: number;
        overdue_count: number;
        profit: number;
      };
    },
  });
}
