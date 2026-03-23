import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery, type PaginationParams } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";
import type { WarrantyItem, WarrantyReturn, WarrantyRule } from "../types";

const db = supabase as any;

export interface WarrantyAnalytics {
  total_warranties: number;
  active_warranties: number;
  expired_warranties: number;
  voided_warranties: number;
  total_returns: number;
  open_returns: number;
  return_rate: number;
  expiring_soon: number;
  returns_by_cause: { cause: string; count: number }[];
  returns_by_outcome: { outcome: string; count: number }[];
  top_returning_devices: { device: string; count: number }[];
  returns_by_technician: { technician: string; count: number }[];
  recent_returns: {
    id: string;
    warranty_number: string;
    reason: string;
    return_cause: string | null;
    outcome: string | null;
    status: string;
    customer_name: string;
    created_at: string;
    technical_analysis: string | null;
    resolved_at: string | null;
    new_service_order_id: string | null;
  }[];
}

const defaultAnalytics: WarrantyAnalytics = {
  total_warranties: 0,
  active_warranties: 0,
  expired_warranties: 0,
  voided_warranties: 0,
  total_returns: 0,
  open_returns: 0,
  return_rate: 0,
  expiring_soon: 0,
  returns_by_cause: [],
  returns_by_outcome: [],
  top_returning_devices: [],
  returns_by_technician: [],
  recent_returns: [],
};

export function useWarrantyAnalytics(from?: string, to?: string) {
  return useQuery({
    queryKey: ["warranty-analytics", from, to],
    queryFn: async () => {
      const params: any = {};
      if (from) params._from = from;
      if (to) params._to = to;
      const { data, error } = await db.rpc("warranty_analytics", params);
      if (error) throw error;
      if (!data) return defaultAnalytics;
      return { ...defaultAnalytics, ...data } as WarrantyAnalytics;
    },
  });
}

export function useWarrantiesPaginated(search?: string, page: number = 1, statusFilter?: string, typeFilter?: string) {
  return useQuery<PaginatedResult<any>>({
    queryKey: ["warranties-paginated", search, page, statusFilter, typeFilter],
    queryFn: async () => {
      const { data, error } = await db.rpc("search_warranties", {
        _search: search || null,
        _status_filter: statusFilter || null,
        _type_filter: typeFilter || null,
        _page: page,
        _page_size: 25,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      return {
        items: (result.items || []) as any[],
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    },
  });
}

export function useWarrantyDetail(warrantyId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-detail", warrantyId],
    enabled: !!warrantyId,
    queryFn: async () => {
      const { data, error } = await db
        .from("warranties")
        .select("*, service_orders(order_number, customer_id, device_id, reported_issue, status, customers(full_name, phone, email), devices(brand, model, serial_number, device_type))")
        .eq("id", warrantyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useWarrantyItems(warrantyId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-items", warrantyId],
    enabled: !!warrantyId,
    queryFn: async () => {
      const { data, error } = await db
        .from("warranty_items")
        .select("*")
        .eq("warranty_id", warrantyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as WarrantyItem[];
    },
  });
}

export function useWarrantyReturnsList(search?: string, page: number = 1, statusFilter?: string) {
  return useQuery<PaginatedResult<any>>({
    queryKey: ["warranty-returns-list", search, page, statusFilter],
    queryFn: async () => {
      const params: PaginationParams = { page, search };
      const result = await executePaginatedQuery<any>(params, {
        table: "warranty_returns",
        select: "*, warranties(warranty_number, customer_id, service_order_id, service_orders(order_number, customers(full_name)))",
        searchColumns: ["reason"],
        defaultSort: { column: "created_at", ascending: false },
      });
      let items = result.items;
      if (statusFilter) {
        items = items.filter((r: any) => r.status === statusFilter);
      }
      return { ...result, items };
    },
  });
}

export function useWarrantyReturnDetail(returnId: string | undefined) {
  return useQuery({
    queryKey: ["warranty-return-detail", returnId],
    enabled: !!returnId,
    queryFn: async () => {
      const { data, error } = await db
        .from("warranty_returns")
        .select("*, warranties(warranty_number, coverage_description, start_date, end_date, service_order_id, service_orders(order_number, customers(full_name)))")
        .eq("id", returnId!)
        .single();
      if (error) throw error;
      return data as WarrantyReturn & { warranties: any };
    },
  });
}

export function useWarrantyRules() {
  return useQuery({
    queryKey: ["warranty-rules"],
    queryFn: async () => {
      const { data, error } = await db
        .from("warranty_rules")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as WarrantyRule[];
    },
  });
}

export function useVoidWarranty() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ warrantyId, reason }: { warrantyId: string; reason: string }) => {
      const { data, error } = await db.rpc("void_warranty", {
        _warranty_id: warrantyId,
        _reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranties-paginated"] });
      qc.invalidateQueries({ queryKey: ["warranty-detail"] });
      qc.invalidateQueries({ queryKey: ["warranty-analytics"] });
      toast({ title: "Garantia anulada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao anular garantia", description: error.message, variant: "destructive" });
    },
  });
}

export function useResolveReturn() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ returnId, outcome, technicalAnalysis }: {
      returnId: string; outcome: string; technicalAnalysis?: string;
    }) => {
      const { data, error } = await db.rpc("resolve_warranty_return", {
        _return_id: returnId,
        _outcome: outcome,
        _technical_analysis: technicalAnalysis || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warranty-returns-list"] });
      qc.invalidateQueries({ queryKey: ["warranty-return-detail"] });
      qc.invalidateQueries({ queryKey: ["warranty-analytics"] });
      toast({ title: "Retorno resolvido com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao resolver retorno", description: error.message, variant: "destructive" });
    },
  });
}

export function useCustomerWarranties(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-warranties", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("warranties")
        .select("*, service_orders(order_number), warranty_returns(*)")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}
