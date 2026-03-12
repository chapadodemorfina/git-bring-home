import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const sb = supabase as any;

// ── Types ──

export interface ScrapItem {
  id: string;
  device_type: string;
  brand: string | null;
  model: string | null;
  condition: string | null;
  salvageable_parts: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  scrap_category: string | null;
  status: string | null;
  service_order_id: string | null;
  customer_id: string | null;
  imei_serial: string | null;
  color: string | null;
  estimated_recovery_value: number;
  service_orders?: { order_number: string } | null;
  customers?: { full_name: string } | null;
}

export interface ScrapDisassembly {
  id: string;
  scrap_id: string;
  technician_id: string | null;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface ScrapPartRecovered {
  id: string;
  disassembly_id: string;
  product_id: string;
  quantity: number;
  condition: string;
  added_to_stock: boolean;
  created_at: string;
  products?: { name: string; sku: string; cost_price: number } | null;
}

export interface ScrapTriage {
  id: string;
  scrap_id: string;
  triaged_by: string | null;
  still_powers_on: boolean;
  board_responsive: boolean;
  screen_usable: boolean;
  carcass_usable: boolean;
  camera_usable: boolean;
  connectors_usable: boolean;
  battery_usable: boolean;
  buttons_flex_usable: boolean;
  speaker_mic_usable: boolean;
  charge_module_usable: boolean;
  destination: string | null;
  recovery_potential: string | null;
  estimated_value: number;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface ScrapCarcassDetails {
  id: string;
  scrap_id: string;
  color: string | null;
  aesthetic_state: string | null;
  back_cover_ok: boolean;
  frame_ok: boolean;
  buttons_ok: boolean;
  sim_tray_ok: boolean;
  lenses_ok: boolean;
  missing_details: string | null;
  purpose: string | null;
  created_at: string;
  updated_at: string;
}

// ── Scrap items ──

export function useScrapItems() {
  return useQuery<ScrapItem[]>({
    queryKey: ["inventory_scrap"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("inventory_scrap")
        .select("*, service_orders(order_number), customers(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useScrapItem(id: string | undefined) {
  return useQuery<ScrapItem>({
    queryKey: ["inventory_scrap", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("inventory_scrap")
        .select("*, service_orders(order_number), customers(full_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateScrap() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from("inventory_scrap")
        .insert({ ...values, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_scrap"] });
      toast({ title: "Sucata cadastrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateScrap() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await sb
        .from("inventory_scrap")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_scrap"] });
      toast({ title: "Sucata atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Disassemblies ──

export function useScrapDisassemblies(scrapId: string | undefined) {
  return useQuery<ScrapDisassembly[]>({
    queryKey: ["scrap_disassembly", scrapId],
    enabled: !!scrapId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("scrap_disassembly")
        .select("*, profiles(full_name)")
        .eq("scrap_id", scrapId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRecoveredParts(disassemblyId: string | undefined) {
  return useQuery<ScrapPartRecovered[]>({
    queryKey: ["scrap_parts_recovered", disassemblyId],
    enabled: !!disassemblyId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("scrap_parts_recovered")
        .select("*, products(name, sku, cost_price)")
        .eq("disassembly_id", disassemblyId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useAllRecoveredPartsForScrap(scrapId: string | undefined) {
  return useQuery<ScrapPartRecovered[]>({
    queryKey: ["scrap_parts_all", scrapId],
    enabled: !!scrapId,
    queryFn: async () => {
      const { data: disassemblies, error: dErr } = await sb
        .from("scrap_disassembly")
        .select("id")
        .eq("scrap_id", scrapId!);
      if (dErr) throw dErr;
      if (!disassemblies?.length) return [];
      const ids = disassemblies.map((d: any) => d.id);
      const { data, error } = await sb
        .from("scrap_parts_recovered")
        .select("*, products(name, sku, cost_price)")
        .in("disassembly_id", ids)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDisassembly() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ scrapId, notes }: { scrapId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb.from("scrap_disassembly").insert({
        scrap_id: scrapId,
        technician_id: user?.id,
        notes: notes || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["scrap_disassembly"] });
      qc.invalidateQueries({ queryKey: ["inventory_scrap"] });
      toast({ title: "Desmontagem iniciada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useAddRecoveredPart() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { disassembly_id: string; product_id: string; quantity: number; condition: string }) => {
      const { data, error } = await sb.from("scrap_parts_recovered").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrap_parts_recovered"] });
      qc.invalidateQueries({ queryKey: ["scrap_parts_all"] });
      toast({ title: "Peça registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useRecoverPartToStock() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (recoveredPartId: string) => {
      const { data, error } = await sb.rpc("recover_scrap_part", { _recovered_part_id: recoveredPartId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrap_parts_recovered"] });
      qc.invalidateQueries({ queryKey: ["scrap_parts_all"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast({ title: "Peça adicionada ao estoque!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useScrapRecoveryValue() {
  return useQuery<number>({
    queryKey: ["scrap_recovery_value"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("scrap_parts_recovered")
        .select("quantity, products(cost_price)")
        .eq("added_to_stock", true);
      if (error) throw error;
      return (data || []).reduce((sum: number, r: any) => {
        return sum + (r.products?.cost_price || 0) * r.quantity;
      }, 0);
    },
  });
}

// ── Triage ──

export function useScrapTriages(scrapId: string | undefined) {
  return useQuery<ScrapTriage[]>({
    queryKey: ["scrap_triage", scrapId],
    enabled: !!scrapId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("scrap_triage")
        .select("*, profiles:triaged_by(full_name)")
        .eq("scrap_id", scrapId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTriage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from("scrap_triage")
        .insert({ ...values, triaged_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      // Update scrap status to triada
      await sb.from("inventory_scrap").update({
        status: "triada",
        estimated_recovery_value: values.estimated_value || 0,
      }).eq("id", values.scrap_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrap_triage"] });
      qc.invalidateQueries({ queryKey: ["inventory_scrap"] });
      toast({ title: "Triagem registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Carcass Details ──

export function useScrapCarcassDetails(scrapId: string | undefined) {
  return useQuery<ScrapCarcassDetails | null>({
    queryKey: ["scrap_carcass_details", scrapId],
    enabled: !!scrapId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("scrap_carcass_details")
        .select("*")
        .eq("scrap_id", scrapId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCarcassDetails() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await sb
        .from("scrap_carcass_details")
        .upsert(values, { onConflict: "scrap_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrap_carcass_details"] });
      toast({ title: "Detalhes da carcaça salvos" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Dashboard ──

export function useScrapDashboard() {
  return useQuery<any>({
    queryKey: ["scrap_dashboard"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("scrap_dashboard_summary");
      if (error) throw error;
      return data;
    },
  });
}
