import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface CompanySettings {
  company_name: string;
  company_cnpj: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_logo_url: string;
}

const DEFAULTS: CompanySettings = {
  company_name: "",
  company_cnpj: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  company_logo_url: "",
};

const KEYS = Object.keys(DEFAULTS) as (keyof CompanySettings)[];

export function useCompanySettings(): CompanySettings {
  const { data } = useQuery({
    queryKey: ["company-settings-all"],
    queryFn: async () => {
      const { data, error } = await db
        .from("app_settings")
        .select("key, value")
        .in("key", KEYS);
      if (error) throw error;
      const settings = { ...DEFAULTS };
      (data as { key: string; value: string }[]).forEach((row) => {
        if (row.key in settings) {
          (settings as any)[row.key] = row.value || "";
        }
      });
      return settings;
    },
    staleTime: 300_000,
  });
  return data || DEFAULTS;
}
