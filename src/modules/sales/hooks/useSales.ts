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
      const subtotal = payload.items.reduce((sum, i) => sum + (i.unit_price * i.quantity - i.discount), 0);
      const total = subtotal - payload.discount_amount + payload.surcharge_amount;

      // 1. Create sale
      const { data: sale, error: saleErr } = await db
        .from("sales")
        .insert({
          sale_number: "", // trigger fills
          customer_id: payload.customer_id || null,
          seller_user_id: payload.seller_user_id,
          subtotal,
          discount_amount: payload.discount_amount,
          surcharge_amount: payload.surcharge_amount,
          total_amount: total,
          notes: payload.notes || null,
        })
        .select()
        .single();
      if (saleErr) throw saleErr;

      // 2. Insert items
      const itemRows = payload.items.map((i) => ({
        sale_id: sale.id,
        product_id: i.product_id,
        sku_snapshot: i.sku,
        product_name_snapshot: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price_snapshot: i.cost_price,
        discount_amount: i.discount,
        total_amount: i.unit_price * i.quantity - i.discount,
      }));
      const { error: itemsErr } = await db.from("sale_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      // 3. Insert payments
      if (payload.payments.length > 0) {
        const payRows = payload.payments.map((p) => ({
          sale_id: sale.id,
          payment_method: p.method,
          amount: p.amount,
          installments: p.installments || null,
          reference: p.reference || null,
        }));
        const { error: payErr } = await db.from("sale_payments").insert(payRows);
        if (payErr) throw payErr;
      }

      // 4. Finalize if requested
      if (payload.finalize) {
        const { data: result, error: compErr } = await db.rpc("complete_sale", { _sale_id: sale.id });
        if (compErr) throw compErr;
      }

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
      const subtotal = payload.items.reduce((sum, i) => sum + (i.unit_price * i.quantity - i.discount), 0);
      const total = subtotal - payload.discount_amount + payload.surcharge_amount;

      // Update sale header
      const { error: saleErr } = await db
        .from("sales")
        .update({
          customer_id: payload.customer_id || null,
          subtotal,
          discount_amount: payload.discount_amount,
          surcharge_amount: payload.surcharge_amount,
          total_amount: total,
          notes: payload.notes || null,
        })
        .eq("id", payload.sale_id);
      if (saleErr) throw saleErr;

      // Replace items: delete old, insert new
      const { error: delItemsErr } = await db.from("sale_items").delete().eq("sale_id", payload.sale_id);
      if (delItemsErr) throw delItemsErr;

      const itemRows = payload.items.map((i) => ({
        sale_id: payload.sale_id,
        product_id: i.product_id,
        sku_snapshot: i.sku,
        product_name_snapshot: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price_snapshot: i.cost_price,
        discount_amount: i.discount,
        total_amount: i.unit_price * i.quantity - i.discount,
      }));
      const { error: itemsErr } = await db.from("sale_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      // Replace payments
      const { error: delPayErr } = await db.from("sale_payments").delete().eq("sale_id", payload.sale_id);
      if (delPayErr) throw delPayErr;

      if (payload.payments.length > 0) {
        const payRows = payload.payments.map((p) => ({
          sale_id: payload.sale_id,
          payment_method: p.method,
          amount: p.amount,
          reference: p.reference || null,
        }));
        const { error: payErr } = await db.from("sale_payments").insert(payRows);
        if (payErr) throw payErr;
      }

      // Finalize if requested
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
    }) => {
      const { error } = await db.from("sale_payments").insert({
        sale_id: params.sale_id,
        payment_method: params.payment_method,
        amount: params.amount,
        installments: params.installments || null,
        reference: params.reference || null,
        notes: params.notes || null,
      });
      if (error) throw error;

      // Recalculate payment status
      const { data: payments } = await db
        .from("sale_payments")
        .select("amount")
        .eq("sale_id", params.sale_id);
      const { data: sale } = await db
        .from("sales")
        .select("total_amount")
        .eq("id", params.sale_id)
        .single();

      if (payments && sale) {
        const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
        const newStatus = totalPaid >= sale.total_amount ? "paid" : totalPaid > 0 ? "partial" : "pending";
        await db.from("sales").update({ payment_status: newStatus }).eq("id", params.sale_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale"] });
      qc.invalidateQueries({ queryKey: ["sale-payments"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
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
