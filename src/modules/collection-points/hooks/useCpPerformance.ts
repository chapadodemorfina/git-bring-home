import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface CpPerformanceEntry {
  cp_id: string;
  cp_name: string;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  avg_ticket: number;
  commission_value: number;
  commission_type: string;
  calculated_commission: number;
}

export function useCpPerformance(dateFrom?: string | null, dateTo?: string | null, cpId?: string | null) {
  return useQuery<CpPerformanceEntry[]>({
    queryKey: ["cp-performance", dateFrom, dateTo, cpId],
    queryFn: async () => {
      const { data, error } = await db.rpc("collection_point_performance", {
        _from: dateFrom || null,
        _to: dateTo || null,
        _cp_id: cpId || null,
      });
      if (error) throw error;
      return (data || []) as CpPerformanceEntry[];
    },
  });
}
