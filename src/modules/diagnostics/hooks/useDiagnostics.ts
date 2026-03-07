import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Diagnostic, DiagnosticFormData, RepairQuote, RepairQuoteItem,
  QuoteItemFormData, QuoteApproval, QuoteStatus,
} from "../types";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

// ─── Diagnostics ───────────────────────────────────────────────
export function useDiagnostic(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["diagnostic", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnostics")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Diagnostic | null;
    },
  });
}

export function useSaveDiagnostic() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, serviceOrderId, data }: {
      id?: string; serviceOrderId: string; data: DiagnosticFormData;
    }) => {
      const payload = {
        service_order_id: serviceOrderId,
        technical_findings: data.technical_findings || null,
        probable_cause: data.probable_cause || null,
        required_parts: data.required_parts || null,
        repair_complexity: data.repair_complexity,
        estimated_repair_hours: data.estimated_repair_hours ?? null,
        internal_notes: data.internal_notes || null,
      };

      if (id) {
        const { data: result, error } = await db.from("diagnostics").update(payload).eq("id", id).select().single();
        if (error) throw error;
        return result as Diagnostic;
      } else {
        const { data: result, error } = await db.from("diagnostics").insert(payload).select().single();
        if (error) throw error;
        return result as Diagnostic;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["diagnostic", vars.serviceOrderId] });
      toast({ title: "Diagnóstico salvo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar diagnóstico", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Quotes ────────────────────────────────────────────────────
export function useQuotes(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["quotes", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_quotes")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RepairQuote[];
    },
  });
}

export function useQuote(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await db.from("repair_quotes").select("*").eq("id", quoteId!).single();
      if (error) throw error;
      return data as RepairQuote;
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ serviceOrderId, analysisFee, expiresAt, notes }: {
      serviceOrderId: string; analysisFee?: number; expiresAt?: string; notes?: string;
    }) => {
      const { data, error } = await db.from("repair_quotes").insert({
        service_order_id: serviceOrderId,
        analysis_fee: analysisFee || 0,
        expires_at: expiresAt || null,
        notes: notes || null,
      }).select().single();
      if (error) throw error;
      return data as RepairQuote;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quotes", vars.serviceOrderId] });
      toast({ title: "Orçamento criado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar orçamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RepairQuote> }) => {
      const { data: result, error } = await db.from("repair_quotes").update(data).eq("id", id).select().single();
      if (error) throw error;
      return result as RepairQuote;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote", result.id] });
      toast({ title: "Orçamento atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar orçamento", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Quote Items ───────────────────────────────────────────────
export function useQuoteItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote-items", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_quote_items")
        .select("*")
        .eq("quote_id", quoteId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as RepairQuoteItem[];
    },
  });
}

export function useAddQuoteItem() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: QuoteItemFormData }) => {
      const totalPrice = data.quantity * data.unit_price;
      const { error } = await db.from("repair_quote_items").insert({
        quote_id: quoteId,
        item_type: data.item_type,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_price: totalPrice,
      });
      if (error) throw error;

      await recalculateQuoteTotal(quoteId);
      return quoteId;
    },
    onSuccess: (quoteId) => {
      qc.invalidateQueries({ queryKey: ["quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Item adicionado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar item", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteQuoteItem() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      const { error } = await db.from("repair_quote_items").delete().eq("id", id);
      if (error) throw error;
      await recalculateQuoteTotal(quoteId);
      return quoteId;
    },
    onSuccess: (quoteId) => {
      qc.invalidateQueries({ queryKey: ["quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Item removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover item", description: error.message, variant: "destructive" });
    },
  });
}

async function recalculateQuoteTotal(quoteId: string) {
  const { data: items } = await db.from("repair_quote_items").select("total_price").eq("quote_id", quoteId);
  const { data: quote } = await db.from("repair_quotes").select("discount_percent, discount_amount, analysis_fee").eq("id", quoteId).single();

  if (!items || !quote) return;

  const subtotal = (items as any[]).reduce((sum, i) => sum + Number(i.total_price), 0);
  let total = subtotal;
  if (quote.discount_percent > 0) total -= total * (quote.discount_percent / 100);
  total -= Number(quote.discount_amount || 0);
  total += Number(quote.analysis_fee || 0);
  total = Math.max(0, total);

  await db.from("repair_quotes").update({ total_amount: total }).eq("id", quoteId);
}

// ─── Approvals (ATOMIC via RPC) ──────────────────────────────
export function useQuoteApprovals(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote-approvals", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await db
        .from("quote_approvals")
        .select("*")
        .eq("quote_id", quoteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteApproval[];
    },
  });
}

export function useRecordApproval() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, serviceOrderId, decision, decidedByName, reason, chargeAnalysisFee }: {
      quoteId: string; serviceOrderId: string; decision: "approved" | "rejected";
      decidedByName?: string; reason?: string; chargeAnalysisFee?: boolean;
    }) => {
      const { data, error } = await db.rpc("approve_reject_quote", {
        _quote_id: quoteId,
        _decision: decision,
        _decided_by_name: decidedByName || null,
        _decided_by_role: "admin",
        _reason: reason || null,
        _charge_analysis_fee: chargeAnalysisFee || false,
      });
      if (error) throw error;
      return { quoteId, serviceOrderId, result: data };
    },
    onSuccess: ({ quoteId, serviceOrderId }) => {
      qc.invalidateQueries({ queryKey: ["quote-approvals", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes", serviceOrderId] });
      qc.invalidateQueries({ queryKey: ["service-order", serviceOrderId] });
      qc.invalidateQueries({ queryKey: ["so-status-history", serviceOrderId] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      toast({ title: "Decisão registrada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar decisão", description: error.message, variant: "destructive" });
    },
  });
}
