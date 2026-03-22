import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export type SOItemType = "service" | "product" | "labor";

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  item_type: SOItemType;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
  notes: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface SOItemFormData {
  item_type: SOItemType;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  sort_order?: number;
}

export const itemTypeLabels: Record<SOItemType, string> = {
  service: "Serviço",
  product: "Produto/Peça",
  labor: "Mão de Obra",
};

export function useServiceOrderItems(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["so-items", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_items")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ServiceOrderItem[];
    },
  });
}

export function useAddSOItem() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ serviceOrderId, data }: { serviceOrderId: string; data: SOItemFormData }) => {
      const { data: item, error } = await db
        .from("service_order_items")
        .insert({
          service_order_id: serviceOrderId,
          item_type: data.item_type,
          product_id: data.product_id || null,
          description: data.description,
          quantity: data.quantity,
          unit_price: data.unit_price,
          notes: data.notes || null,
          sort_order: data.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return item as ServiceOrderItem;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["so-items", vars.serviceOrderId] });
      toast({ title: "Item adicionado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar item", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateSOItem() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, serviceOrderId, data }: { id: string; serviceOrderId: string; data: Partial<SOItemFormData> }) => {
      const { error } = await db
        .from("service_order_items")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      return serviceOrderId;
    },
    onSuccess: (soId) => {
      qc.invalidateQueries({ queryKey: ["so-items", soId] });
      toast({ title: "Item atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar item", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSOItem() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, serviceOrderId }: { id: string; serviceOrderId: string }) => {
      const { error } = await db
        .from("service_order_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return serviceOrderId;
    },
    onSuccess: (soId) => {
      qc.invalidateQueries({ queryKey: ["so-items", soId] });
      toast({ title: "Item removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover item", description: error.message, variant: "destructive" });
    },
  });
}
