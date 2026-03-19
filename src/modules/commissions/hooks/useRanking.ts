import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface RankingEntry {
  user_id: string;
  name: string;
  role: string;
  sales_count: number;
  sales_revenue: number;
  so_count: number;
  so_revenue: number;
  total_revenue: number;
  ticket_avg: number;
  commission_total: number;
  goal_pct: number;
}

export function useTeamRanking(dateFrom?: string | null, dateTo?: string | null) {
  return useQuery<RankingEntry[]>({
    queryKey: ["team-ranking", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await db.rpc("team_ranking_data", {
        _from: dateFrom || null,
        _to: dateTo || null,
      });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
  });
}
