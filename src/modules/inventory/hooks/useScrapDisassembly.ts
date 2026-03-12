import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const sb = supabase as any;

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
}

export interface ScrapDisassembly {
  id: string;
  scrap_id: string;
  technician_id: string | null;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
  parts_recovered?: ScrapPartRecovered[];
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

// ── Scrap items list ──
export function useScrapItems() {
  return useQuery<ScrapItem[]>({
    queryKey: ["inventory_scrap"],
    queryFn: async () => {
      const { data, error } = await sb.from("inventory_scrap").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Disassemblies for a scrap item ──
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

// ── Recovered parts for a disassembly ──
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

// ── All recovered parts for a scrap (for history) ──
export function useAllRecoveredPartsForScrap(scrapId: string | undefined) {
  return useQuery<(ScrapPartRecovered & { disassembly?: ScrapDisassembly })[]>({
    queryKey: ["scrap_parts_all", scrapId],
    enabled: !!scrapId,
    queryFn: async () => {
      // Get all disassembly IDs for this scrap
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

// ── Create disassembly ──
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrap_disassembly"] });
      toast({ title: "Desmontagem iniciada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Add recovered part ──
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

// ── Recover part to stock (atomic RPC) ──
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

// ── Scrap recovery value ──
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
        const cost = r.products?.cost_price || 0;
        return sum + cost * r.quantity;
      }, 0);
    },
  });
}
