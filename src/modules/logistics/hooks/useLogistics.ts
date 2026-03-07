import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PickupDelivery, PickupDeliveryFormData, TransportEvent, LogisticsStatus } from "../types";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export function usePickupsDeliveries(search?: string, filterStatus?: string | null) {
  return useQuery({
    queryKey: ["pickups-deliveries", search, filterStatus],
    queryFn: async () => {
      let query = db
        .from("pickups_deliveries")
        .select("*, service_orders!inner(order_number, customers!inner(full_name))")
        .order("created_at", { ascending: false });

      if (filterStatus) query = query.eq("status", filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        order_number: d.service_orders?.order_number,
        customer_name: d.service_orders?.customers?.full_name,
        service_orders: undefined,
      })) as PickupDelivery[];
    },
  });
}

export function usePickupDelivery(id: string | undefined) {
  return useQuery({
    queryKey: ["pickup-delivery", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("pickups_deliveries")
        .select("*, service_orders!inner(order_number, customers!inner(full_name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return {
        ...data,
        order_number: data.service_orders?.order_number,
        customer_name: data.service_orders?.customers?.full_name,
        service_orders: undefined,
      } as PickupDelivery;
    },
  });
}

export function useCreatePickupDelivery() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: PickupDeliveryFormData) => {
      const payload: any = { ...formData };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
      });

      const { data, error } = await db.from("pickups_deliveries").insert(payload).select().single();
      if (error) throw error;

      // Log initial event
      await db.from("transport_events").insert({
        pickup_delivery_id: data.id,
        to_status: "pickup_requested",
        notes: "Solicitação criada",
      });

      return data as PickupDelivery;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickups-deliveries"] });
      toast({ title: "Solicitação logística criada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar solicitação", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdatePickupDelivery() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PickupDeliveryFormData> }) => {
      const payload: any = { ...data };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
      });

      const { data: updated, error } = await db.from("pickups_deliveries").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return updated as PickupDelivery;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pickups-deliveries"] });
      qc.invalidateQueries({ queryKey: ["pickup-delivery", vars.id] });
      toast({ title: "Logística atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });
}

export function useChangeLogisticsStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id, fromStatus, toStatus, notes, proofPath, proofNotes,
    }: {
      id: string;
      fromStatus: LogisticsStatus;
      toStatus: LogisticsStatus;
      notes?: string;
      proofPath?: string;
      proofNotes?: string;
    }) => {
      const updatePayload: any = { status: toStatus };

      if (toStatus === "pickup_scheduled" || toStatus === "return_scheduled") {
        updatePayload.scheduled_date = new Date().toISOString();
      }
      if (toStatus === "returned" || toStatus === "picked_up") {
        updatePayload.completed_date = new Date().toISOString();
      }
      if (proofPath) updatePayload.proof_storage_path = proofPath;
      if (proofNotes) updatePayload.proof_notes = proofNotes;

      const { error: upErr } = await db.from("pickups_deliveries").update(updatePayload).eq("id", id);
      if (upErr) throw upErr;

      const { error: evErr } = await db.from("transport_events").insert({
        pickup_delivery_id: id,
        from_status: fromStatus,
        to_status: toStatus,
        notes: notes || null,
      });
      if (evErr) throw evErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pickups-deliveries"] });
      qc.invalidateQueries({ queryKey: ["pickup-delivery", vars.id] });
      qc.invalidateQueries({ queryKey: ["transport-events", vars.id] });
      toast({ title: "Status logístico atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    },
  });
}

export function useTransportEvents(pickupDeliveryId: string | undefined) {
  return useQuery({
    queryKey: ["transport-events", pickupDeliveryId],
    enabled: !!pickupDeliveryId,
    queryFn: async () => {
      const { data, error } = await db
        .from("transport_events")
        .select("*")
        .eq("pickup_delivery_id", pickupDeliveryId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TransportEvent[];
    },
  });
}

export function useDeletePickupDelivery() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("pickups_deliveries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickups-deliveries"] });
      toast({ title: "Solicitação removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    },
  });
}

export function useUploadProof() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const path = `logistics/${id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("service-order-attachments").upload(path, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await (supabase as any)
        .from("pickups_deliveries")
        .update({ proof_storage_path: path })
        .eq("id", id);
      if (dbErr) throw dbErr;

      return path;
    },
    onSuccess: () => {
      toast({ title: "Comprovante enviado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar comprovante", description: error.message, variant: "destructive" });
    },
  });
}
