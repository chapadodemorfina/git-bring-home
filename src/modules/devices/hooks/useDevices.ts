import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Device, DeviceFormData, DeviceAccessory, AccessoryFormData, DevicePhoto } from "../types";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export function useDevices(search?: string, filterType?: string | null) {
  return useQuery({
    queryKey: ["devices", search, filterType],
    queryFn: async () => {
      let query = db.from("devices").select("*, customers!inner(full_name)").order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `brand.ilike.%${search}%,model.ilike.%${search}%,serial_number.ilike.%${search}%,imei.ilike.%${search}%,color.ilike.%${search}%,reported_issue.ilike.%${search}%`
        );
      }

      if (filterType) {
        query = query.eq("device_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        customer_name: d.customers?.full_name,
        customers: undefined,
      })) as Device[];
    },
  });
}

export function useDevice(id: string | undefined) {
  return useQuery({
    queryKey: ["device", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("devices")
        .select("*, customers!inner(full_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return { ...data, customer_name: data.customers?.full_name, customers: undefined } as Device;
    },
  });
}

export function useDevicesByCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: ["devices-by-customer", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("devices")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Device[];
    },
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: DeviceFormData) => {
      const { data: device, error } = await db.from("devices").insert({
        customer_id: data.customer_id,
        device_type: data.device_type,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        imei: data.imei || null,
        color: data.color || null,
        password_notes: data.password_notes || null,
        physical_condition: data.physical_condition || null,
        reported_issue: data.reported_issue || null,
        internal_notes: data.internal_notes || null,
        is_active: data.is_active,
      }).select().single();
      if (error) throw error;
      return device as Device;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Dispositivo cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cadastrar dispositivo", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DeviceFormData }) => {
      const { data: device, error } = await db.from("devices").update({
        customer_id: data.customer_id,
        device_type: data.device_type,
        brand: data.brand || null,
        model: data.model || null,
        serial_number: data.serial_number || null,
        imei: data.imei || null,
        color: data.color || null,
        password_notes: data.password_notes || null,
        physical_condition: data.physical_condition || null,
        reported_issue: data.reported_issue || null,
        internal_notes: data.internal_notes || null,
        is_active: data.is_active,
      }).eq("id", id).select().single();
      if (error) throw error;
      return device as Device;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["device", vars.id] });
      toast({ title: "Dispositivo atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar dispositivo", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Dispositivo excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir dispositivo", description: error.message, variant: "destructive" });
    },
  });
}

// Accessories
export function useDeviceAccessories(deviceId: string | undefined) {
  return useQuery({
    queryKey: ["device-accessories", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      const { data, error } = await db
        .from("device_accessories")
        .select("*")
        .eq("device_id", deviceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DeviceAccessory[];
    },
  });
}

export function useSaveAccessory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, deviceId, data }: { id?: string; deviceId: string; data: AccessoryFormData }) => {
      if (id) {
        const { error } = await db.from("device_accessories").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("device_accessories").insert({ ...data, device_id: deviceId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["device-accessories", vars.deviceId] });
      toast({ title: "Acessório salvo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar acessório", description: error.message, variant: "destructive" });
    },
  });
}

export function useBulkCreateAccessories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId, accessories }: { deviceId: string; accessories: { name: string; delivered: boolean }[] }) => {
      const rows = accessories.map((a) => ({ device_id: deviceId, name: a.name, delivered: a.delivered }));
      const { error } = await db.from("device_accessories").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["device-accessories", vars.deviceId] });
    },
  });
}

export function useDeleteAccessory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, deviceId }: { id: string; deviceId: string }) => {
      const { error } = await db.from("device_accessories").delete().eq("id", id);
      if (error) throw error;
      return deviceId;
    },
    onSuccess: (deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["device-accessories", deviceId] });
      toast({ title: "Acessório removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover acessório", description: error.message, variant: "destructive" });
    },
  });
}

// Photos
export function useDevicePhotos(deviceId: string | undefined) {
  return useQuery({
    queryKey: ["device-photos", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      const { data, error } = await db
        .from("device_photos")
        .select("*")
        .eq("device_id", deviceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DevicePhoto[];
    },
  });
}

export function useUploadDevicePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ deviceId, file, caption }: { deviceId: string; file: File; caption?: string }) => {
      const ext = file.name.split(".").pop();
      const path = `${deviceId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("device-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await db.from("device_photos").insert({
        device_id: deviceId,
        storage_path: path,
        caption: caption || null,
      });
      if (dbError) throw dbError;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["device-photos", vars.deviceId] });
      toast({ title: "Foto enviada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteDevicePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, deviceId, storagePath }: { id: string; deviceId: string; storagePath: string }) => {
      await supabase.storage.from("device-photos").remove([storagePath]);
      const { error } = await db.from("device_photos").delete().eq("id", id);
      if (error) throw error;
      return deviceId;
    },
    onSuccess: (deviceId) => {
      queryClient.invalidateQueries({ queryKey: ["device-photos", deviceId] });
      toast({ title: "Foto removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover foto", description: error.message, variant: "destructive" });
    },
  });
}

export { useSignedUrl as useDevicePhotoUrl } from "@/hooks/useSignedUrl";
