import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export interface TechOrder {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  reported_issue: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  device_label: string;
  device_id: string | null;
}

export function useTechnicianOrders(statusFilter?: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tech-orders", user?.id, statusFilter],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = db
        .from("service_orders")
        .select("id, order_number, status, priority, reported_issue, created_at, updated_at, device_id, customers!inner(full_name), devices(brand, model)")
        .eq("assigned_technician_id", user!.id)
        .order("updated_at", { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      } else {
        query = query.not("status", "in", '("delivered","cancelled")');
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      return (data as any[]).map((d) => ({
        id: d.id,
        order_number: d.order_number,
        status: d.status,
        priority: d.priority,
        reported_issue: d.reported_issue,
        created_at: d.created_at,
        updated_at: d.updated_at,
        device_id: d.device_id,
        customer_name: d.customers?.full_name || "",
        device_label: d.devices ? `${d.devices.brand || ""} ${d.devices.model || ""}`.trim() : "",
      })) as TechOrder[];
    },
  });
}

export function useTechQueueCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tech-queue-counts", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_orders")
        .select("status")
        .eq("assigned_technician_id", user!.id)
        .not("status", "in", '("delivered","cancelled")');

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data as any[]).forEach((d) => {
        counts[d.status] = (counts[d.status] || 0) + 1;
      });

      return {
        diagnosis: (counts["awaiting_diagnosis"] || 0) + (counts["triage"] || 0),
        repair: (counts["in_repair"] || 0) + (counts["awaiting_parts"] || 0),
        testing: counts["in_testing"] || 0,
        total: (data as any[]).length,
      };
    },
  });
}
