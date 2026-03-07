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
) {
  return useQuery({
    queryKey: ["financial-entries", entryType, status],
    queryFn: async () => {
      let query = db
        .from("financial_entries")
        .select("*, customers(full_name), suppliers(name), service_orders(order_number)")
        .order("created_at", { ascending: false });

      if (entryType) query = query.eq("entry_type", entryType);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        customer_name: d.customers?.full_name,
        supplier_name: d.suppliers?.name,
        order_number: d.service_orders?.order_number,
        customers: undefined,
        suppliers: undefined,
        service_orders: undefined,
      })) as FinancialEntry[];
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

// ── Payments ──

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
      const payload: any = {
        financial_entry_id: entryId,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date || new Date().toISOString(),
        reference: data.reference || null,
        notes: data.notes || null,
      };

      const { data: payment, error } = await db.from("payments").insert(payload).select().single();
      if (error) throw error;

      // Update paid_amount and status on the entry
      const { data: entry } = await db.from("financial_entries").select("amount, paid_amount").eq("id", entryId).single();
      if (entry) {
        const newPaid = Number(entry.paid_amount) + data.amount;
        const newStatus = newPaid >= Number(entry.amount) ? "paid" : "partial";
        await db.from("financial_entries").update({ paid_amount: newPaid, status: newStatus }).eq("id", entryId);
      }

      return payment as Payment;
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

// ── Dashboard Summary ──

export function useFinanceSummary() {
  return useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("entry_type, status, amount, paid_amount");
      if (error) throw error;

      const entries = data as { entry_type: string; status: string; amount: number; paid_amount: number }[];

      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalCommissions = 0;
      let pendingReceivables = 0;
      let pendingPayables = 0;
      let overdueCount = 0;

      for (const e of entries) {
        const amt = Number(e.amount);
        const paid = Number(e.paid_amount);

        if (e.entry_type === "revenue") {
          totalRevenue += amt;
          if (e.status === "pending" || e.status === "partial") pendingReceivables += (amt - paid);
          if (e.status === "overdue") { pendingReceivables += (amt - paid); overdueCount++; }
        } else if (e.entry_type === "expense") {
          totalExpenses += amt;
          if (e.status === "pending" || e.status === "partial") pendingPayables += (amt - paid);
          if (e.status === "overdue") { pendingPayables += (amt - paid); overdueCount++; }
        } else if (e.entry_type === "commission") {
          totalCommissions += amt;
          if (e.status === "pending" || e.status === "partial") pendingPayables += (amt - paid);
        }
      }

      return {
        totalRevenue,
        totalExpenses,
        totalCommissions,
        profit: totalRevenue - totalExpenses - totalCommissions,
        pendingReceivables,
        pendingPayables,
        overdueCount,
      };
    },
  });
}
