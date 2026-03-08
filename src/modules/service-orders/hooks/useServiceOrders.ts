import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ServiceOrder, ServiceOrderFormData, StatusHistoryEntry,
  ServiceOrderSignature, ServiceOrderAttachment, ServiceOrderTerm,
  ServiceOrderStatus,
} from "../types";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

const PAGE_SIZE = 50;

export function useServiceOrders(search?: string, filterStatus?: string | null, page: number = 1) {
  return useQuery({
    queryKey: ["service-orders", search, filterStatus, page],
    queryFn: async () => {
      let countQuery = db
        .from("service_orders")
        .select("id", { count: "exact", head: true });

      let query = db
        .from("service_orders")
        .select("*, customers!inner(full_name), devices(brand, model)")
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (search) {
        const filter = `order_number.ilike.%${search}%,reported_issue.ilike.%${search}%`;
        query = query.or(filter);
        countQuery = countQuery.or(filter);
      }
      if (filterStatus) {
        query = query.eq("status", filterStatus);
        countQuery = countQuery.eq("status", filterStatus);
      }

      const [{ data, error }, { count }] = await Promise.all([query, countQuery]);
      if (error) throw error;
      return {
        items: (data as any[]).map((d) => ({
          ...d,
          customer_name: d.customers?.full_name,
          device_label: d.devices ? `${d.devices.brand || ""} ${d.devices.model || ""}`.trim() : null,
          customers: undefined,
          devices: undefined,
        })) as ServiceOrder[],
        total: count || 0,
        page,
        pageSize: PAGE_SIZE,
      };
    },
  });
}

export function useServiceOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["service-order", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_orders")
        .select("*, customers!inner(full_name, phone, document), devices(brand, model, device_type, serial_number, imei, color), collection_points(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return {
        ...data,
        customer_name: data.customers?.full_name,
        customer_phone: data.customers?.phone || null,
        customer_document: data.customers?.document || null,
        device_label: data.devices ? `${data.devices.brand || ""} ${data.devices.model || ""}`.trim() : null,
        device_type: data.devices?.device_type || null,
        device_serial: data.devices?.serial_number || null,
        device_imei: data.devices?.imei || null,
        device_color: data.devices?.color || null,
        device_brand: data.devices?.brand || null,
        device_model: data.devices?.model || null,
        collection_point_name: data.collection_points?.name || null,
        customers: undefined,
        devices: undefined,
        collection_points: undefined,
      } as ServiceOrder;
    },
  });
}

export function useCreateServiceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ServiceOrderFormData) => {
      const payload: any = {
        customer_id: data.customer_id,
        priority: data.priority,
        intake_channel: data.intake_channel,
        reported_issue: data.reported_issue || null,
        physical_condition: data.physical_condition || null,
        accessories_received: data.accessories_received || null,
        intake_notes: data.intake_notes || null,
        internal_notes: data.internal_notes || null,
        expected_deadline: data.expected_deadline || null,
        assigned_technician_id: data.assigned_technician_id || null,
      };
      if (data.device_id) payload.device_id = data.device_id;

      const { data: so, error } = await db.from("service_orders").insert(payload).select().single();
      if (error) throw error;

      // Log initial status
      await db.from("service_order_status_history").insert({
        service_order_id: so.id,
        to_status: "received",
        notes: "Ordem de serviço criada",
      });

      // Auto-generate public tracking token
      try {
        await db.rpc("generate_public_tracking_token", {
          _service_order_id: so.id,
        });
      } catch (e) {
        console.warn("Failed to auto-generate tracking token:", e);
      }

      return so as ServiceOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-orders"] });
      toast({ title: "Ordem de serviço criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar OS", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateServiceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceOrderFormData> }) => {
      const payload: any = { ...data };
      if (payload.device_id === "") delete payload.device_id;
      if (payload.assigned_technician_id === "") payload.assigned_technician_id = null;
      if (payload.expected_deadline === "") payload.expected_deadline = null;

      const { data: so, error } = await db.from("service_orders").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return so as ServiceOrder;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["service-orders"] });
      qc.invalidateQueries({ queryKey: ["service-order", vars.id] });
      toast({ title: "OS atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar OS", description: error.message, variant: "destructive" });
    },
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, fromStatus, toStatus, notes }: {
      id: string; fromStatus: ServiceOrderStatus; toStatus: ServiceOrderStatus; notes?: string;
    }) => {
      const { error: updateErr } = await db.from("service_orders").update({ status: toStatus }).eq("id", id);
      if (updateErr) throw updateErr;

      const { error: histErr } = await db.from("service_order_status_history").insert({
        service_order_id: id,
        from_status: fromStatus,
        to_status: toStatus,
        notes: notes || null,
      });
      if (histErr) throw histErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["service-orders"] });
      qc.invalidateQueries({ queryKey: ["service-order", vars.id] });
      qc.invalidateQueries({ queryKey: ["so-status-history", vars.id] });
      toast({ title: "Status atualizado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar status", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteServiceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-orders"] });
      toast({ title: "OS excluída com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir OS", description: error.message, variant: "destructive" });
    },
  });
}

// Status History
export function useStatusHistory(orderId: string | undefined) {
  return useQuery({
    queryKey: ["so-status-history", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_status_history")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StatusHistoryEntry[];
    },
  });
}

// Signatures
export function useOrderSignatures(orderId: string | undefined) {
  return useQuery({
    queryKey: ["so-signatures", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_signatures")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ServiceOrderSignature[];
    },
  });
}

export function useSaveSignature() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, signerName, signerRole, signatureData }: {
      orderId: string; signerName: string; signerRole: string; signatureData: string;
    }) => {
      const { error } = await db.from("service_order_signatures").insert({
        service_order_id: orderId,
        signer_name: signerName,
        signer_role: signerRole,
        signature_data: signatureData,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["so-signatures", vars.orderId] });
      toast({ title: "Assinatura salva!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar assinatura", description: error.message, variant: "destructive" });
    },
  });
}

// Attachments
export function useOrderAttachments(orderId: string | undefined) {
  return useQuery({
    queryKey: ["so-attachments", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_attachments")
        .select("*")
        .eq("service_order_id", orderId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ServiceOrderAttachment[];
    },
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, file, caption }: { orderId: string; file: File; caption?: string }) => {
      const ext = file.name.split(".").pop();
      const path = `${orderId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("service-order-attachments").upload(path, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await db.from("service_order_attachments").insert({
        service_order_id: orderId,
        storage_path: path,
        file_name: file.name,
        file_type: file.type,
        caption: caption || null,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["so-attachments", vars.orderId] });
      toast({ title: "Arquivo enviado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar arquivo", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, orderId, storagePath }: { id: string; orderId: string; storagePath: string }) => {
      await supabase.storage.from("service-order-attachments").remove([storagePath]);
      const { error } = await db.from("service_order_attachments").delete().eq("id", id);
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => {
      qc.invalidateQueries({ queryKey: ["so-attachments", orderId] });
      toast({ title: "Arquivo removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover arquivo", description: error.message, variant: "destructive" });
    },
  });
}

export { useSignedUrl as useAttachmentUrl } from "@/hooks/useSignedUrl";

// Terms
export function useActiveTerms() {
  return useQuery({
    queryKey: ["so-terms-active"],
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_terms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ServiceOrderTerm[];
    },
  });
}
