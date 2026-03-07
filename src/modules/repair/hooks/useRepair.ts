import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RepairService, RepairServiceFormData, RepairTest, Warranty, WarrantyReturn } from "../types";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

// ─── Repair Services (Tech Log) ────────────────────────────────
export function useRepairServices(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["repair-services", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_services")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RepairService[];
    },
  });
}

export function useAddRepairService() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ serviceOrderId, data }: { serviceOrderId: string; data: RepairServiceFormData }) => {
      const { error } = await db.from("repair_services").insert({
        service_order_id: serviceOrderId,
        action_type: data.action_type,
        description: data.description,
        time_spent_minutes: data.time_spent_minutes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repair-services", vars.serviceOrderId] });
      toast({ title: "Registro adicionado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar ação", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Repair Tests ──────────────────────────────────────────────
export function useRepairTests(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["repair-tests", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_tests")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as RepairTest[];
    },
  });
}

export function useInitializeTests() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ serviceOrderId, testNames }: { serviceOrderId: string; testNames: string[] }) => {
      const rows = testNames.map((name, i) => ({
        service_order_id: serviceOrderId,
        test_name: name,
        sort_order: i,
      }));
      const { error } = await db.from("repair_tests").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repair-tests", vars.serviceOrderId] });
      toast({ title: "Checklist de testes criado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar checklist", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateTest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, serviceOrderId, passed, notes }: {
      id: string; serviceOrderId: string; passed: boolean | null; notes?: string;
    }) => {
      const update: any = { passed, tested_at: passed !== null ? new Date().toISOString() : null };
      if (notes !== undefined) update.notes = notes;
      const { error } = await db.from("repair_tests").update(update).eq("id", id);
      if (error) throw error;
      return serviceOrderId;
    },
    onSuccess: (serviceOrderId) => {
      qc.invalidateQueries({ queryKey: ["repair-tests", serviceOrderId] });
    },
  });
}

// ─── Warranties ────────────────────────────────────────────────
export function useWarranty(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["warranty", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("warranties")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Warranty | null;
    },
  });
}

export function useCreateWarranty() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ serviceOrderId, coverageDescription, terms, durationDays }: {
      serviceOrderId: string; coverageDescription?: string; terms?: string; durationDays?: number;
    }) => {
      const days = durationDays || 90;
      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];

      const { data, error } = await db.from("warranties").insert({
        service_order_id: serviceOrderId,
        start_date: startDate,
        end_date: endDate,
        coverage_description: coverageDescription || "Garantia padrão de serviço — cobre o reparo realizado.",
        terms: terms || `Garantia válida por ${days} dias a partir da data de entrega. Cobre exclusivamente o serviço realizado. Não cobre mau uso, danos físicos ou líquidos.`,
      }).select().single();
      if (error) throw error;
      return data as Warranty;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["warranty", vars.serviceOrderId] });
      toast({ title: "Garantia gerada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao gerar garantia", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Warranty Returns (ATOMIC via RPC) ─────────────────────────
export function useWarrantyReturns(warrantyId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-returns", warrantyId],
    enabled: !!warrantyId,
    queryFn: async () => {
      const { data, error } = await db
        .from("warranty_returns")
        .select("*")
        .eq("warranty_id", warrantyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WarrantyReturn[];
    },
  });
}

export function useCreateWarrantyReturn() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ warrantyId, originalServiceOrderId, reason }: {
      warrantyId: string; originalServiceOrderId: string; reason: string;
    }) => {
      const { data, error } = await db.rpc("create_warranty_return", {
        _warranty_id: warrantyId,
        _reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["warranty-returns", vars.warrantyId] });
      qc.invalidateQueries({ queryKey: ["service-orders"] });
      toast({ title: "Retorno de garantia registrado — nova OS criada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar retorno", description: error.message, variant: "destructive" });
    },
  });
}
