import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, differenceInHours } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

export function useDashboardData(dateRange: DateRange) {
  const from = dateRange.from.toISOString();
  const to = dateRange.to.toISOString();

  const serviceOrders = useQuery({
    queryKey: ["dashboard-service-orders", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, status, priority, created_at, updated_at, assigned_technician_id, collection_point_id, intake_channel, device_id")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const completedOrders = useQuery({
    queryKey: ["dashboard-completed-orders", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_status_history")
        .select("service_order_id, created_at, from_status, to_status")
        .in("to_status", ["delivered", "ready_for_pickup"])
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const quotes = useQuery({
    queryKey: ["dashboard-quotes", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_quotes")
        .select("id, status, total_amount, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const warranties = useQuery({
    queryKey: ["dashboard-warranties", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranties")
        .select("id, is_void, start_date, end_date, service_order_id, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const devices = useQuery({
    queryKey: ["dashboard-devices", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, device_type, brand, model, reported_issue, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const partsUsed = useQuery({
    queryKey: ["dashboard-parts-used", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_parts_used")
        .select("id, product_id, quantity, total_cost, total_price, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const financialEntries = useQuery({
    queryKey: ["dashboard-financial", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_entries")
        .select("id, entry_type, amount, paid_amount, status, category, created_at, collection_point_id")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const collectionPoints = useQuery({
    queryKey: ["dashboard-collection-points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_points")
        .select("id, name, is_active");
      if (error) throw error;
      return data || [];
    },
  });

  const diagnostics = useQuery({
    queryKey: ["dashboard-diagnostics", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostics")
        .select("id, probable_cause, repair_complexity, created_at")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) throw error;
      return data || [];
    },
  });

  const profiles = useQuery({
    queryKey: ["dashboard-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = serviceOrders.isLoading || quotes.isLoading || financialEntries.isLoading || 
    devices.isLoading || partsUsed.isLoading || warranties.isLoading || completedOrders.isLoading ||
    collectionPoints.isLoading || diagnostics.isLoading || profiles.isLoading;

  return {
    serviceOrders: serviceOrders.data || [],
    completedOrders: completedOrders.data || [],
    quotes: quotes.data || [],
    warranties: warranties.data || [],
    devices: devices.data || [],
    partsUsed: partsUsed.data || [],
    financialEntries: financialEntries.data || [],
    collectionPoints: collectionPoints.data || [],
    diagnostics: diagnostics.data || [],
    profiles: profiles.data || [],
    isLoading,
  };
}

export function useMonthlyTrend() {
  return useQuery({
    queryKey: ["dashboard-monthly-trend"],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        const [ordersRes, revenueRes, expenseRes] = await Promise.all([
          supabase.from("service_orders").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
          supabase.from("financial_entries").select("amount").eq("entry_type", "revenue").gte("created_at", start).lte("created_at", end),
          supabase.from("financial_entries").select("amount").eq("entry_type", "expense").gte("created_at", start).lte("created_at", end),
        ]);

        const revenue = (revenueRes.data || []).reduce((sum, e) => sum + Number(e.amount), 0);
        const expenses = (expenseRes.data || []).reduce((sum, e) => sum + Number(e.amount), 0);

        months.push({
          month: format(date, "MMM"),
          orders: ordersRes.count || 0,
          revenue,
          expenses,
          profit: revenue - expenses,
        });
      }
      return months;
    },
  });
}
