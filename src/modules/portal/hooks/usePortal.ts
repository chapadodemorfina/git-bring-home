import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

// Get customer_id linked to the authenticated user's email
export function useCustomerByAuth() {
  return useQuery({
    queryKey: ["portal-customer"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Não autenticado");

      const { data, error } = await db
        .from("customers")
        .select("id, full_name, email, phone, whatsapp")
        .eq("email", user.email)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Cliente não encontrado para este email");
      return data as { id: string; full_name: string; email: string; phone: string | null; whatsapp: string | null };
    },
  });
}

// Customer's service orders
export function usePortalServiceOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ["portal-orders", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_orders")
        .select("*, devices(brand, model)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        device_label: d.devices ? `${d.devices.brand || ""} ${d.devices.model || ""}`.trim() : null,
        devices: undefined,
      }));
    },
  });
}

// Single service order with status history
export function usePortalServiceOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["portal-order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_orders")
        .select("*, devices(brand, model), customers!inner(full_name)")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return {
        ...data,
        device_label: data.devices ? `${data.devices.brand || ""} ${data.devices.model || ""}`.trim() : null,
        customer_name: data.customers?.full_name,
        devices: undefined,
        customers: undefined,
      };
    },
  });
}

export function usePortalStatusHistory(orderId: string | undefined) {
  return useQuery({
    queryKey: ["portal-status-history", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_status_history")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Quotes for approval
export function usePortalQuotes(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["portal-quotes", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_quotes")
        .select("*, repair_quote_items(*)")
        .eq("service_order_id", serviceOrderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePortalApproveQuote() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, serviceOrderId, decision, reason }: {
      quoteId: string; serviceOrderId: string; decision: "approved" | "rejected"; reason?: string;
    }) => {
      const { error: appErr } = await db.from("quote_approvals").insert({
        quote_id: quoteId,
        decision,
        decided_by_role: "customer",
        reason: reason || null,
      });
      if (appErr) throw appErr;

      const { error: qErr } = await db.from("repair_quotes").update({ status: decision }).eq("id", quoteId);
      if (qErr) throw qErr;

      if (decision === "approved") {
        await db.from("service_orders").update({ status: "in_repair" }).eq("id", serviceOrderId);
        await db.from("service_order_status_history").insert({
          service_order_id: serviceOrderId,
          from_status: "awaiting_customer_approval",
          to_status: "in_repair",
          notes: "Orçamento aprovado pelo cliente (portal)",
        });
      } else {
        await db.from("service_orders").update({ status: "cancelled" }).eq("id", serviceOrderId);
        await db.from("service_order_status_history").insert({
          service_order_id: serviceOrderId,
          from_status: "awaiting_customer_approval",
          to_status: "cancelled",
          notes: reason ? `Orçamento rejeitado: ${reason}` : "Orçamento rejeitado pelo cliente (portal)",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-quotes"] });
      qc.invalidateQueries({ queryKey: ["portal-orders"] });
      qc.invalidateQueries({ queryKey: ["portal-order"] });
      toast({ title: "Decisão registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

// Warranties
export function usePortalWarranties(customerId: string | undefined) {
  return useQuery({
    queryKey: ["portal-warranties", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      // Get all SO ids for the customer first
      const { data: orders } = await db
        .from("service_orders")
        .select("id, order_number")
        .eq("customer_id", customerId!);
      if (!orders?.length) return [];

      const orderIds = orders.map((o: any) => o.id);
      const orderMap = Object.fromEntries(orders.map((o: any) => [o.id, o.order_number]));

      const { data, error } = await db
        .from("warranties")
        .select("*")
        .in("service_order_id", orderIds)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data as any[]).map((w) => ({
        ...w,
        order_number: orderMap[w.service_order_id] || "",
      }));
    },
  });
}

// Attachments
export function usePortalAttachments(orderId: string | undefined) {
  return useQuery({
    queryKey: ["portal-attachments", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_attachments")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Logistics
export function usePortalLogistics(customerId: string | undefined) {
  return useQuery({
    queryKey: ["portal-logistics", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data: orders } = await db
        .from("service_orders")
        .select("id")
        .eq("customer_id", customerId!);
      if (!orders?.length) return [];

      const orderIds = orders.map((o: any) => o.id);
      const { data, error } = await db
        .from("pickups_deliveries")
        .select("*, service_orders!inner(order_number)")
        .in("service_order_id", orderIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        order_number: d.service_orders?.order_number,
        service_orders: undefined,
      }));
    },
  });
}
