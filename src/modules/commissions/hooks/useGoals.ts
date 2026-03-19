import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";
import type { SalesGoal, GoalProgress } from "../types";

const db = supabase as any;

export function useGoals(page: number = 1) {
  return useQuery<PaginatedResult<SalesGoal>>({
    queryKey: ["sales-goals", page],
    queryFn: async () => {
      return executePaginatedQuery<any>(
        { page },
        {
          table: "sales_goals",
          select: "*, profiles!sales_goals_user_id_fkey(full_name)",
          defaultSort: { column: "period_start", ascending: false },
        }
      ).then((result) => ({
        ...result,
        items: result.items.map((g: any) => ({
          ...g,
          user_name: g.profiles?.full_name || null,
          profiles: undefined,
        })),
      }));
    },
  });
}

export function useGoalProgress(goalIds: string[]) {
  return useQuery<GoalProgress[]>({
    queryKey: ["goal-progress", goalIds],
    enabled: goalIds.length > 0,
    queryFn: async () => {
      const results: GoalProgress[] = [];
      for (const id of goalIds) {
        const { data, error } = await db.rpc("get_goal_progress", { _goal_id: id });
        if (!error && data) results.push(data as GoalProgress);
      }
      return results;
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: Partial<SalesGoal>) => {
      const { data, error } = await db.from("sales_goals").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-goals"] });
      toast({ title: "Meta criada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesGoal> }) => {
      const { error } = await db.from("sales_goals").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-goals"] });
      qc.invalidateQueries({ queryKey: ["goal-progress"] });
      toast({ title: "Meta atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("sales_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-goals"] });
      toast({ title: "Meta removida!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
