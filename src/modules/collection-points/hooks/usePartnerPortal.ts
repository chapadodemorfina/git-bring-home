import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/** Get the collection point linked to the current user */
export function useMyCollectionPoint() {
  return useQuery({
    queryKey: ["my-collection-point"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: cpUser, error: cpuErr } = await db
        .from("collection_point_users")
        .select("collection_point_id, collection_points(id, name, commission_type, commission_value)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (cpuErr) throw cpuErr;
      if (!cpUser) throw new Error("Nenhum ponto de coleta vinculado à sua conta");

      return cpUser.collection_points as {
        id: string; name: string;
        commission_type: string; commission_value: number;
      };
    },
  });
}

/** Service orders for partner's collection point */
export function usePartnerOrders(cpId: string | undefined) {
  return useQuery({
    queryKey: ["partner-orders", cpId],
    enabled: !!cpId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_orders")
        .select("*, customers!inner(full_name), devices(brand, model)")
        .eq("collection_point_id", cpId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]).map((d: any) => ({
        ...d,
        customer_name: d.customers?.full_name,
        device_label: d.devices ? `${d.devices.brand || ""} ${d.devices.model || ""}`.trim() : null,
        customers: undefined,
        devices: undefined,
      }));
    },
  });
}

/** Commissions for partner's collection point */
export function usePartnerCommissions(cpId: string | undefined) {
  return useQuery({
    queryKey: ["partner-commissions", cpId],
    enabled: !!cpId,
    queryFn: async () => {
      const { data, error } = await db
        .from("collection_point_commissions")
        .select("*, service_orders(order_number)")
        .eq("collection_point_id", cpId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

/** Dashboard KPIs for partner */
export function usePartnerDashboard(cpId: string | undefined) {
  return useQuery({
    queryKey: ["partner-dashboard", cpId],
    enabled: !!cpId,
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Orders this month
      const { data: monthOrders } = await db
        .from("service_orders")
        .select("id, status")
        .eq("collection_point_id", cpId!)
        .gte("created_at", firstDay);

      // Commissions
      const { data: commissions } = await db
        .from("collection_point_commissions")
        .select("calculated_amount, is_paid")
        .eq("collection_point_id", cpId!);

      const orders = monthOrders || [];
      const comms = commissions || [];

      return {
        sentThisMonth: orders.length,
        pendingRepairs: orders.filter((o: any) => !["delivered", "cancelled"].includes(o.status)).length,
        completedRepairs: orders.filter((o: any) => o.status === "delivered").length,
        totalCommissions: comms.reduce((s: number, c: any) => s + c.calculated_amount, 0),
        paidCommissions: comms.filter((c: any) => c.is_paid).reduce((s: number, c: any) => s + c.calculated_amount, 0),
        pendingCommissions: comms.filter((c: any) => !c.is_paid).reduce((s: number, c: any) => s + c.calculated_amount, 0),
      };
    },
  });
}
