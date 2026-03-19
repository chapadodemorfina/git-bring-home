import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CollectionPointSettings } from "../types";
import { defaultCpSettings } from "../types";

const db = supabase as any;

/**
 * For collection_point_operator users, fetches their CP settings.
 * Returns null for non-CP users.
 */
export function useCpPermissions() {
  const { roles, user } = useAuth();
  const isCpOperator = roles.includes("collection_point_operator" as any);

  const { data: settings, isLoading } = useQuery<CollectionPointSettings | null>({
    queryKey: ["my-cp-settings", user?.id],
    enabled: isCpOperator && !!user,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_my_cp_settings");
      if (error) throw error;
      if (!data) return defaultCpSettings;
      return { ...defaultCpSettings, ...data } as CollectionPointSettings;
    },
  });

  const can = (permission: keyof CollectionPointSettings): boolean => {
    if (!isCpOperator) return true; // non-CP users are unrestricted
    if (isLoading || !settings) return false;
    return settings[permission] ?? false;
  };

  return { isCpOperator, settings, isLoading, can };
}
