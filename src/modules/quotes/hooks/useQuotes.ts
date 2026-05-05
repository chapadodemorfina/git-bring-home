import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery, PaginationParams, SupabasePaginatedQueryOptions } from "@/hooks/usePaginatedQuery";
import type { CommercialQuote, CommercialQuoteItem, QuoteHistoryEntry, QuotesSummary, QuoteFormData, QuoteItemFormData } from "../types";

const db = supabase as any;

// ─── Summary ───────────────────────────────────────────────────
export function useQuotesSummary() {
  return useQuery({
    queryKey: ["quotes-summary"],
    queryFn: async () => {
      const { data, error } = await db.rpc("quotes_summary");
      if (error) throw error;
      return data as QuotesSummary;
    },
  });
}

// ─── Paginated list ────────────────────────────────────────────
export function useQuotesList(params: PaginationParams & { status?: string }) {
  const opts: SupabasePaginatedQueryOptions = {
    table: "quotes",
    select: "*, customers(full_name), service_orders(order_number)",
    searchColumns: ["quote_number", "title"],
    defaultSort: { column: "created_at", ascending: false },
    additionalFilters: (q: any) => {
      if (params.status) q = q.eq("status", params.status);
      return q;
    },
  };
  return useQuery({
    queryKey: ["quotes-list", params],
    queryFn: () => executePaginatedQuery<CommercialQuote>(params, opts),
  });
}

// ─── Single quote ──────────────────────────────────────────────
export function useCommercialQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["commercial-quote", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("quotes")
        .select("*, customers(full_name), service_orders(order_number)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as CommercialQuote;
    },
  });
}

// ─── Create ────────────────────────────────────────────────────
export function useCreateCommercialQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const { data: result, error } = await db.from("quotes").insert({
        customer_id: data.customer_id,
        device_id: data.device_id || null,
        service_order_id: data.service_order_id || null,
        title: data.title,
        description: data.description || null,
        valid_until: data.valid_until || null,
        discount_amount: data.discount_amount || 0,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (error) throw error;
      // Log history
      await db.from("quote_history").insert({
        quote_id: result.id,
        action: "created",
        notes: "Orçamento criado",
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      return result as CommercialQuote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes-list"] });
      qc.invalidateQueries({ queryKey: ["quotes-summary"] });
      toast({ title: "Orçamento criado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Update ────────────────────────────────────────────────────
export function useUpdateCommercialQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuoteFormData> }) => {
      // Update parcial seguro: só inclui no payload os campos efetivamente enviados
      // pelo caller. Para campos opcionais sensíveis (device_id, service_order_id),
      // string vazia é tratada como "limpar"; undefined significa "não tocar".
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        if ((key === "device_id" || key === "service_order_id") && value === "") {
          payload[key] = null;
        } else {
          payload[key] = value;
        }
      }
      const { error } = await db.from("quotes").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["commercial-quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes-list"] });
      qc.invalidateQueries({ queryKey: ["quotes-summary"] });
      toast({ title: "Orçamento atualizado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Status changes (via RPCs transacionais) ──────────────────
export type QuoteStatusTransition = "sent" | "approved" | "rejected" | "cancelled" | "expired";

const STATUS_RPC_MAP: Record<QuoteStatusTransition, string> = {
  sent: "quote_send",
  approved: "quote_approve",
  rejected: "quote_reject",
  cancelled: "quote_cancel",
  expired: "quote_expire",
};

export function useChangeQuoteStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: QuoteStatusTransition; reason?: string }) => {
      const fn = STATUS_RPC_MAP[status];
      if (!fn) throw new Error(`Transição não suportada: ${status}`);
      const args: Record<string, unknown> = { p_quote_id: id };
      if (status === "rejected" || status === "cancelled") {
        args.p_reason = reason ?? null;
      }
      const { data, error } = await db.rpc(fn, args);
      if (error) throw error;
      return data;
      // Histórico é gravado pela própria RPC; não inserir manualmente.
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["commercial-quote", id] });
      qc.invalidateQueries({ queryKey: ["quotes-list"] });
      qc.invalidateQueries({ queryKey: ["quotes-summary"] });
      qc.invalidateQueries({ queryKey: ["quote-history", id] });
      toast({ title: "Status atualizado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Duplicate ─────────────────────────────────────────────────
export function useDuplicateQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: src } = await db.from("quotes").select("*").eq("id", sourceId).single();
      if (!src) throw new Error("Orçamento não encontrado");
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data: newQ, error } = await db.from("quotes").insert({
        customer_id: src.customer_id,
        device_id: src.device_id,
        service_order_id: src.service_order_id,
        title: src.title + " (cópia)",
        description: src.description,
        discount_amount: src.discount_amount,
        valid_until: src.valid_until,
        created_by: userId,
      }).select().single();
      if (error) throw error;
      // Copy items
      const { data: items } = await db.from("quote_items").select("*").eq("quote_id", sourceId);
      if (items?.length) {
        await db.from("quote_items").insert(
          items.map((i: any) => ({
            quote_id: newQ.id,
            item_type: i.item_type,
            product_id: i.product_id,
            description: i.description,
            quantity: i.quantity,
            unit_cost: i.unit_cost,
            unit_price: i.unit_price,
          }))
        );
        await db.rpc("recalculate_quote_totals", { _quote_id: newQ.id });
      }
      await db.from("quote_history").insert({
        quote_id: newQ.id, action: "duplicated",
        notes: `Duplicado de ${src.quote_number}`, created_by: userId,
      });
      return newQ as CommercialQuote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes-list"] });
      qc.invalidateQueries({ queryKey: ["quotes-summary"] });
      toast({ title: "Orçamento duplicado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── Items ─────────────────────────────────────────────────────
export function useQuoteItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["commercial-quote-items", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await db
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CommercialQuoteItem[];
    },
  });
}

export function useAddQuoteItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: QuoteItemFormData }) => {
      const { error } = await db.from("quote_items").insert({
        quote_id: quoteId,
        item_type: data.item_type,
        product_id: data.product_id || null,
        description: data.description,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        unit_price: data.unit_price,
      });
      if (error) throw error;
      await db.rpc("recalculate_quote_totals", { _quote_id: quoteId });
      return quoteId;
    },
    onSuccess: (quoteId) => {
      qc.invalidateQueries({ queryKey: ["commercial-quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["commercial-quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes-list"] });
      toast({ title: "Item adicionado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteQuoteItem() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      const { error } = await db.from("quote_items").delete().eq("id", id);
      if (error) throw error;
      await db.rpc("recalculate_quote_totals", { _quote_id: quoteId });
      return quoteId;
    },
    onSuccess: (quoteId) => {
      qc.invalidateQueries({ queryKey: ["commercial-quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["commercial-quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes-list"] });
      toast({ title: "Item removido!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ─── History ───────────────────────────────────────────────────
export function useQuoteHistory(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote-history", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await db
        .from("quote_history")
        .select("*, profiles:created_by(full_name)")
        .eq("quote_id", quoteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteHistoryEntry[];
    },
  });
}
