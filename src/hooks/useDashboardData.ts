import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardSummary {
  total_orders: number;
  open_orders: number;
  orders_by_status: Record<string, number>;
  total_revenue: number;
  total_expenses: number;
  total_commissions: number;
  quotes_total: number;
  quotes_approved: number;
  warranties_total: number;
  warranties_voided: number;
  avg_turnaround_hours: number | null;
  sla_overdue_count: number;
  device_types: Record<string, number>;
  top_defects: { cause: string; count: number }[];
  technician_orders: { technician_id: string; name: string; count: number }[];
  collection_point_orders: { cp_id: string; name: string; count: number }[];
  monthly_trend: { month: string; orders: number; revenue: number; expenses: number; profit: number }[];
}

export function useDashboardData(dateRange: DateRange) {
  const from = dateRange.from.toISOString();
  const to = dateRange.to.toISOString();

  return useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", from, to],
    queryFn: async () => {
      const { data, error } = await db.rpc("dashboard_summary", {
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return data as DashboardSummary;
    },
  });
}

// Keep for backward compatibility
export function useMonthlyTrend() {
  return useQuery<{ month: string; orders: number; revenue: number; expenses: number; profit: number }[]>({
    queryKey: ["dashboard-monthly-trend"],
    queryFn: async () => {
      // Monthly trend is now included in dashboard_summary, but this hook
      // can be used independently. We call the summary with a wide range.
      const from = new Date(Date.now() - 180 * 86400000).toISOString();
      const to = new Date().toISOString();
      const { data, error } = await db.rpc("dashboard_summary", {
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return (data as DashboardSummary).monthly_trend || [];
    },
  });
}
