import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  billing_provider: string;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number | null;
    max_users: number;
    max_service_orders_per_month: number;
    max_products: number;
  };
}

export function useSubscription() {
  const { activeTenant } = useTenant();
  const db = supabase as any;

  return useQuery<Subscription | null>({
    queryKey: ["subscription", activeTenant?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("tenant_id", activeTenant!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        plan: data.plans,
      } as Subscription;
    },
    enabled: !!activeTenant?.id,
    staleTime: 60_000,
  });
}
