import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface PlanUsage {
  has_subscription: boolean;
  plan_name?: string;
  plan_slug?: string;
  status?: string;
  trial_ends_at?: string;
  current_period_end?: string;
  users?: { current: number; limit: number };
  service_orders?: { current: number; limit: number };
  products?: { current: number; limit: number };
}

export function usePlanUsage() {
  const { activeTenant } = useTenant();

  return useQuery<PlanUsage>({
    queryKey: ["plan-usage", activeTenant],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_plan_usage", {
        _tenant_id: activeTenant!,
      });
      if (error) throw error;
      return data as unknown as PlanUsage;
    },
    enabled: !!activeTenant,
    staleTime: 60_000,
  });
}
