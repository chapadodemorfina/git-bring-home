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
  quotes_rejected: number;
  warranties_total: number;
  warranties_voided: number;
  avg_turnaround_hours: number | null;
  sla_overdue_count: number;
  device_types: Record<string, number>;
  top_defects: { cause: string; count: number }[];
  technician_orders: { technician_id: string; name: string; count: number }[];
  collection_point_orders: { cp_id: string; name: string; count: number; revenue: number; commissions: number }[];
  monthly_trend: { month: string; orders: number; revenue: number; expenses: number; profit: number }[];
  today_received: number;
  today_delivered: number;
  today_revenue: number;
  today_quotes: number;
  avg_diagnosis_hours: number | null;
  avg_ticket_value: number | null;
  top_parts: { name: string; sku: string; qty: number; cost: number }[];
  stock_value: number;
  low_stock_count: number;
  pipeline: Record<string, number>;
}

const defaultSummary: DashboardSummary = {
  total_orders: 0,
  open_orders: 0,
  orders_by_status: {},
  total_revenue: 0,
  total_expenses: 0,
  total_commissions: 0,
  quotes_total: 0,
  quotes_approved: 0,
  quotes_rejected: 0,
  warranties_total: 0,
  warranties_voided: 0,
  avg_turnaround_hours: null,
  sla_overdue_count: 0,
  device_types: {},
  top_defects: [],
  technician_orders: [],
  collection_point_orders: [],
  monthly_trend: [],
  today_received: 0,
  today_delivered: 0,
  today_revenue: 0,
  today_quotes: 0,
  avg_diagnosis_hours: null,
  avg_ticket_value: null,
  top_parts: [],
  stock_value: 0,
  low_stock_count: 0,
  pipeline: {},
};

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
      if (!data) return defaultSummary;
      return {
        ...defaultSummary,
        ...data,
        orders_by_status: data.orders_by_status || {},
        device_types: data.device_types || {},
        pipeline: data.pipeline || {},
        monthly_trend: data.monthly_trend || [],
        top_defects: data.top_defects || [],
        technician_orders: data.technician_orders || [],
        collection_point_orders: data.collection_point_orders || [],
        top_parts: data.top_parts || [],
      } as DashboardSummary;
    },
  });
}

export function useMonthlyTrend() {
  return useQuery<{ month: string; orders: number; revenue: number; expenses: number; profit: number }[]>({
    queryKey: ["dashboard-monthly-trend"],
    queryFn: async () => {
      const from = new Date(Date.now() - 180 * 86400000).toISOString();
      const to = new Date().toISOString();
      const { data, error } = await db.rpc("dashboard_summary", { _from: from, _to: to });
      if (error) throw error;
      return (data as DashboardSummary)?.monthly_trend || [];
    },
  });
}
