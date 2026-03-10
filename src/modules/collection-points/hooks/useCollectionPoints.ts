import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  CollectionPoint, CollectionPointUser, CollectionTransfer,
  CollectionPointCommission, CollectionPointFormData, TransferStatus,
} from "../types";

const sb = supabase as any;

// ── Collection Points ──
export function useCollectionPoints(search?: string) {
  return useQuery<CollectionPoint[]>({
    queryKey: ["collection_points", search],
    queryFn: async () => {
      let query = sb.from("collection_points").select("*").order("name");
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,responsible_person.ilike.%${search}%,city.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCollectionPoint(id: string | undefined) {
  return useQuery<CollectionPoint>({
    queryKey: ["collection_points", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from("collection_points").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCollectionPoint() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: CollectionPointFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        name: values.name,
        company_name: values.company_name || null,
        responsible_person: values.responsible_person || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        email: values.email || null,
        street: values.street || null,
        number: values.number || null,
        complement: values.complement || null,
        neighborhood: values.neighborhood || null,
        city: values.city || null,
        state: values.state || null,
        zip_code: values.zip_code || null,
        notes: values.notes || null,
        commission_type: values.commission_type,
        commission_value: values.commission_value,
        created_by: user?.id,
      };
      const { data, error } = await sb.from("collection_points").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collection_points"] }); toast({ title: "Ponto de coleta criado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCollectionPoint() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CollectionPointFormData }) => {
      const payload: any = {
        name: values.name,
        company_name: values.company_name || null,
        responsible_person: values.responsible_person || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        email: values.email || null,
        street: values.street || null,
        number: values.number || null,
        complement: values.complement || null,
        neighborhood: values.neighborhood || null,
        city: values.city || null,
        state: values.state || null,
        zip_code: values.zip_code || null,
        notes: values.notes || null,
        commission_type: values.commission_type,
        commission_value: values.commission_value,
      };
      const { error } = await sb.from("collection_points").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collection_points"] }); toast({ title: "Ponto de coleta atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Collection Point Users ──
export function useCollectionPointUsers(cpId: string | undefined) {
  return useQuery<CollectionPointUser[]>({
    queryKey: ["collection_point_users", cpId],
    enabled: !!cpId,
    queryFn: async () => {
      const { data, error } = await sb.from("collection_point_users").select("*, profiles(full_name, email)").eq("collection_point_id", cpId);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddCollectionPointUser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ collectionPointId, userId }: { collectionPointId: string; userId: string }) => {
      const { error } = await sb.from("collection_point_users").insert({ collection_point_id: collectionPointId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collection_point_users"] }); toast({ title: "Operador vinculado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useRemoveCollectionPointUser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("collection_point_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collection_point_users"] }); toast({ title: "Operador removido" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Transfers ──
export function useCollectionTransfers(filters?: { cpId?: string; soId?: string }) {
  return useQuery<CollectionTransfer[]>({
    queryKey: ["collection_transfers", filters],
    queryFn: async () => {
      let q = sb.from("collection_transfers")
        .select("*, service_orders(order_number, status), collection_points(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.cpId) q = q.eq("collection_point_id", filters.cpId);
      if (filters?.soId) q = q.eq("service_order_id", filters.soId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      service_order_id: string;
      collection_point_id: string;
      direction: string;
      status: TransferStatus;
      tracking_code?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await sb.from("collection_transfers").insert({
        ...payload,
        tracking_code: payload.tracking_code || null,
        notes: payload.notes || null,
        transferred_by: user?.id,
        transferred_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collection_transfers"] }); toast({ title: "Transferência registrada" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTransferStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: TransferStatus; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const update: any = { status };
      if (status === "received_at_center" || status === "delivered_to_collection_point" || status === "delivered_to_customer") {
        update.received_by = user?.id;
        update.received_at = new Date().toISOString();
      }
      if (notes) update.notes = notes;
      const { error } = await sb.from("collection_transfers").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["collection_transfers"] }); toast({ title: "Status atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Commissions ──
export function useCollectionPointCommissions(cpId: string | undefined) {
  return useQuery<CollectionPointCommission[]>({
    queryKey: ["collection_point_commissions", cpId],
    enabled: !!cpId,
    queryFn: async () => {
      const { data, error } = await sb.from("collection_point_commissions")
        .select("*, service_orders(order_number)")
        .eq("collection_point_id", cpId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
