import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface CpRankingEntry {
  rank_position: number;
  cp_id: string;
  cp_name: string;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  avg_ticket: number;
  commission: number;
}

export function useCpRanking(from?: string | null, to?: string | null, cpId?: string | null) {
  return useQuery<CpRankingEntry[]>({
    queryKey: ["cp-ranking", from, to, cpId],
    queryFn: async () => {
      const { data, error } = await db.rpc("cp_ranking", {
        _from: from || null,
        _to: to || null,
        _cp_id: cpId || null,
      });
      if (error) throw error;
      return (data || []) as CpRankingEntry[];
    },
  });
}
