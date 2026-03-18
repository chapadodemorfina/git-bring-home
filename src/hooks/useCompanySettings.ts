import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface CompanySettings {
  // Identity
  company_name: string;
  company_legal_name: string;
  company_cnpj: string;
  company_logo_url: string;
  company_primary_color: string;
  // Address
  company_street: string;
  company_number: string;
  company_neighborhood: string;
  company_city: string;
  company_state: string;
  company_zip: string;
  company_address: string; // legacy computed
  // Contact
  company_phone: string;
  company_email: string;
  whatsapp_support_number: string;
  company_website: string;
  company_instagram: string;
  // PDF settings
  pdf_show_qrcode: string;
  pdf_show_signatures: string;
  pdf_show_terms: string;
  pdf_mode: string; // "compact" | "full"
  // Terms
  terms_service: string;
  terms_warranty: string;
  terms_abandonment: string;
  // Operational
  default_warranty_days: string;
  default_whatsapp_message: string;
}

const DEFAULTS: CompanySettings = {
  company_name: "",
  company_legal_name: "",
  company_cnpj: "",
  company_logo_url: "",
  company_primary_color: "#1e40af",
  company_street: "",
  company_number: "",
  company_neighborhood: "",
  company_city: "",
  company_state: "",
  company_zip: "",
  company_address: "",
  company_phone: "",
  company_email: "",
  whatsapp_support_number: "",
  company_website: "",
  company_instagram: "",
  pdf_show_qrcode: "true",
  pdf_show_signatures: "true",
  pdf_show_terms: "true",
  pdf_mode: "compact",
  terms_service: "",
  terms_warranty: "",
  terms_abandonment: "",
  default_warranty_days: "90",
  default_whatsapp_message: "",
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
      // Compute legacy address field
      const parts = [settings.company_street, settings.company_number, settings.company_neighborhood, settings.company_city, settings.company_state].filter(Boolean);
      if (parts.length > 0 && !settings.company_address) {
        settings.company_address = parts.join(", ");
      }
      return settings;
    },
    staleTime: 300_000,
  });
  return data || DEFAULTS;
}

/** Helper to check boolean settings — empty/undefined defaults to true (show) */
export function settingIsTrue(value: string | undefined): boolean {
  return value !== "false" && value !== "0";
}
