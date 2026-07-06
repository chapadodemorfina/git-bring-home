import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import type { PaginatedResult } from "@/components/ui/data-pagination";
import type { Sale, SaleItem, SalePayment, SaleReturn, SaleFormItem, SalePaymentMethod, SaleStatus, SalePaymentStatus } from "../types";

const db = supabase as any;

// ── Paginated Sales List ──
export function useSales(
  search?: string,
  statusFilter?: SaleStatus | null,
  paymentFilter?: SalePaymentStatus | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  page: number = 1,
) {
  return useQuery<PaginatedResult<Sale>>({
    queryKey: ["sales", search, statusFilter, paymentFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const { data, error } = await db.rpc("search_sales", {
        _search: search || null,
        _status: statusFilter || null,
        _payment_status: paymentFilter || null,
        _date_from: dateFrom || null,
        _date_to: dateTo || null,
        _page: page,
        _page_size: 25,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      return {
        items: (result.items || []) as Sale[],
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    },
  });
}

// ── Single Sale Detail ──
export function useSale(id: string | undefined) {
  return useQuery<Sale>({
    queryKey: ["sale", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("sales")
        .select("*, customers(full_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;

      // Fetch seller name separately since there's no FK to profiles
      let sellerName: string | null = null;
      if (data.seller_user_id) {
        const { data: profile } = await db
          .from("profiles")
          .select("full_name")
          .eq("id", data.seller_user_id)
          .maybeSingle();
        sellerName = profile?.full_name || null;
      }

      return {
        ...data,
        customer_name: data.customers?.full_name || null,
        seller_name: sellerName,
      } as Sale;
    },
  });
}

// ── Sale Items ──
export function useSaleItems(saleId: string | undefined) {
  return useQuery<SaleItem[]>({
    queryKey: ["sale-items", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await db
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId!)
        .order("created_at");
      if (error) throw error;
      return data as SaleItem[];
    },
  });
}

// ── Sale Payments ──
export function useSalePayments(saleId: string | undefined) {
  return useQuery<SalePayment[]>({
    queryKey: ["sale-payments", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await db
        .from("sale_payments")
        .select("*")
        .eq("sale_id", saleId!)
        .order("paid_at");
      if (error) throw error;
      return data as SalePayment[];
    },
  });
}

// ── Sale Returns ──
export function useSaleReturns(saleId: string | undefined) {
  return useQuery<SaleReturn[]>({
    queryKey: ["sale-returns", saleId],
    enabled: !!saleId,
    queryFn: async () => {
      const { data, error } = await db
        .from("sale_returns")
        .select("*")
        .eq("sale_id", saleId!)
        .order("returned_at", { ascending: false });
      if (error) throw error;
      return data as SaleReturn[];
    },
  });
}

// ── Create Sale (draft) ──
export function useCreateSale() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      customer_id?: string | null;
      seller_user_id: string;
      items: SaleFormItem[];
      discount_amount: number;
      surcharge_amount: number;
      notes?: string;
      payments: { method: SalePaymentMethod; amount: number; installments?: number; reference?: string }[];
      finalize: boolean;
    }) => {
      // Toda a criação de venda (sales + sale_items + sale_payments + finalize)
      // passa pela RPC transacional `create_sale` (Fase 3.5.12.5-c.1).
      // Ela roda em SECURITY DEFINER, valida auth/tenant/`sales.create`,
      // valida produtos por tenant, recalcula subtotal/total/payment_status
      // server-side, impede pagamento maior que total, chama `complete_sale`
      // internamente quando `_finalize=true` e grava auditoria `sale_created`.
      const { data: saleId, error: rpcErr } = await db.rpc("create_sale", {
        _sale_data: {
          customer_id: payload.customer_id ?? null,
          seller_user_id: payload.seller_user_id,
          discount_amount: payload.discount_amount ?? 0,
          surcharge_amount: payload.surcharge_amount ?? 0,
          notes: payload.notes ?? null,
        },
        _items: payload.items.map((i) => ({
          product_id: i.product_id,
          sku_snapshot: i.sku,
          product_name_snapshot: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          cost_price_snapshot: i.cost_price,
          discount_amount: i.discount,
        })),
        _payments: (payload.payments ?? []).map((p) => ({
          payment_method: p.method,
          amount: p.amount,
          installments: p.installments ?? null,
          reference: p.reference ?? null,
        })),
        _finalize: payload.finalize ?? false,
      });
      if (rpcErr) throw rpcErr;

      // Buscar a venda criada para preservar contrato atual do hook
      // (SaleCreatePage usa `sale.id` e `sale.sale_number` para caixa/navegação).
      const { data: sale, error: fetchErr } = await db
        .from("sales")
        .select("*")
        .eq("id", saleId as string)
        .single();
      if (fetchErr) throw fetchErr;

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      toast({ title: "Venda registrada com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro ao registrar venda", description: e.message, variant: "destructive" }),
  });
}

// ── Update Draft Sale ──
export function useUpdateDraftSale() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      sale_id: string;
      customer_id?: string | null;
      items: SaleFormItem[];
      discount_amount: number;
      surcharge_amount: number;
      notes?: string;
      payments: { method: SalePaymentMethod; amount: number; reference?: string }[];
      finalize: boolean;
    }) => {
      // Toda a atualização de venda draft passa pela RPC transacional
      // `update_draft_sale` (Fase 3.5.12.5-a). Ela substitui itens e pagamentos
      // dentro de SECURITY DEFINER, valida permissão `sales.update`, bloqueia
      // vendas não-draft, recalcula `payment_status` server-side e audita.
      const saleData = {
        customer_id: payload.customer_id || null,
        discount_amount: payload.discount_amount,
        surcharge_amount: payload.surcharge_amount,
        notes: payload.notes || null,
      };
      const itemsPayload = payload.items.map((i) => ({
        product_id: i.product_id,
        sku_snapshot: i.sku,
        product_name_snapshot: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price_snapshot: i.cost_price,
        discount_amount: i.discount,
      }));
      const paymentsPayload = payload.payments.map((p) => ({
        payment_method: p.method,
        amount: p.amount,
        reference: p.reference || null,
      }));

      const { error: rpcErr } = await db.rpc("update_draft_sale", {
        _sale_id: payload.sale_id,
        _sale_data: saleData,
        _items: itemsPayload,
        _payments: paymentsPayload,
        _finalize: false,
      });
      if (rpcErr) throw rpcErr;

      // A finalização continua sendo delegada ao fluxo existente `complete_sale`,
      // que trata estoque, comissão e movimentos financeiros. Mantido fora da RPC
      // para preservar comportamento atual (Opção B do plano da fase).
      if (payload.finalize) {
        const { error: compErr } = await db.rpc("complete_sale", { _sale_id: payload.sale_id });
        if (compErr) throw compErr;
      }

      return { id: payload.sale_id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale"] });
      qc.invalidateQueries({ queryKey: ["sale-items"] });
      qc.invalidateQueries({ queryKey: ["sale-payments"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      toast({ title: "Venda atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });
}

// ── Complete Draft Sale ──
export function useCompleteSale() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await db.rpc("complete_sale", { _sale_id: saleId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      toast({ title: "Venda concluída!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Cancel Sale ──
export function useCancelSale() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason: string }) => {
      const { data, error } = await db.rpc("cancel_sale", { _sale_id: saleId, _reason: reason });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      toast({ title: "Venda cancelada" });
    },
    onError: (e: any) => toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" }),
  });
}

// ── Process Return ──
export function useProcessReturn() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      sale_id: string;
      sale_item_id: string;
      product_id: string | null;
      quantity: number;
      amount_refunded: number;
      reason: string;
    }) => {
      const { data, error } = await db.rpc("process_sale_return", {
        _sale_id: params.sale_id,
        _sale_item_id: params.sale_item_id,
        _product_id: params.product_id,
        _quantity: params.quantity,
        _amount_refunded: params.amount_refunded,
        _reason: params.reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sale"] });
      qc.invalidateQueries({ queryKey: ["sale-items"] });
      qc.invalidateQueries({ queryKey: ["sale-returns"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      toast({ title: "Devolução registrada" });
    },
    onError: (e: any) => toast({ title: "Erro na devolução", description: e.message, variant: "destructive" }),
  });
}

// ── Add Payment to existing sale ──
export function useAddSalePayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      sale_id: string;
      payment_method: SalePaymentMethod;
      amount: number;
      installments?: number;
      reference?: string;
      notes?: string;
      cash_register_id?: string | null;
    }) => {
      const { data, error } = await db.rpc("process_sale_payment", {
        _sale_id: params.sale_id,
        _amount: params.amount,
        _payment_method: params.payment_method,
        _installments: params.installments ?? null,
        _reference: params.reference ?? null,
        _notes: params.notes ?? null,
        _cash_register_id: params.cash_register_id ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale"] });
      qc.invalidateQueries({ queryKey: ["sale-payments"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["cash-register"] });
      qc.invalidateQueries({ queryKey: ["cash-register-movements"] });
      toast({ title: "Pagamento registrado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Dashboard Summary ──
export function useSalesDashboard(from: string, to: string) {
  return useQuery({
    queryKey: ["sales-dashboard", from, to],
    queryFn: async () => {
      const { data, error } = await db.rpc("sales_dashboard_summary", {
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return data;
    },
  });
}
