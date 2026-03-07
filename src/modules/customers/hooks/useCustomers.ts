import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer, CustomerFormData, CustomerAddress, AddressFormData, CustomerContact, ContactFormData } from "../types";
import { useToast } from "@/hooks/use-toast";

// Helper to work around generated types not including new tables
const db = supabase as any;

export function useCustomers(search?: string, filterActive?: boolean | null) {
  return useQuery({
    queryKey: ["customers", search, filterActive],
    queryFn: async () => {
      let query = db.from("customers").select("*").order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,document.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      if (filterActive !== null && filterActive !== undefined) {
        query = query.eq("is_active", filterActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("customers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

export function useCustomerAddresses(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-addresses", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await db.from("customer_addresses").select("*").eq("customer_id", customerId!).order("is_default", { ascending: false });
      if (error) throw error;
      return data as CustomerAddress[];
    },
  });
}

export function useCustomerContacts(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-contacts", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await db.from("customer_contacts").select("*").eq("customer_id", customerId!).order("is_primary", { ascending: false });
      if (error) throw error;
      return data as CustomerContact[];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { data: customer, error } = await db.from("customers").insert({
        type: data.type,
        full_name: data.full_name,
        document: data.document || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        notes: data.notes || null,
        is_active: data.is_active,
      }).select().single();
      if (error) throw error;
      return customer as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const { data: customer, error } = await db.from("customers").update({
        type: data.type,
        full_name: data.full_name,
        document: data.document || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        notes: data.notes || null,
        is_active: data.is_active,
      }).eq("id", id).select().single();
      if (error) throw error;
      return customer as Customer;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", vars.id] });
      toast({ title: "Cliente atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Cliente excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir cliente", description: error.message, variant: "destructive" });
    },
  });
}

export function useSaveAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, customerId, data }: { id?: string; customerId: string; data: AddressFormData }) => {
      if (id) {
        const { error } = await db.from("customer_addresses").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("customer_addresses").insert({ ...data, customer_id: customerId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", vars.customerId] });
      toast({ title: "Endereço salvo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar endereço", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      const { error } = await db.from("customer_addresses").delete().eq("id", id);
      if (error) throw error;
      return customerId;
    },
    onSuccess: (customerId) => {
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", customerId] });
      toast({ title: "Endereço removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover endereço", description: error.message, variant: "destructive" });
    },
  });
}

export function useSaveContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, customerId, data }: { id?: string; customerId: string; data: ContactFormData }) => {
      if (id) {
        const { error } = await db.from("customer_contacts").update(data).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("customer_contacts").insert({ ...data, customer_id: customerId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer-contacts", vars.customerId] });
      toast({ title: "Contato salvo!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar contato", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      const { error } = await db.from("customer_contacts").delete().eq("id", id);
      if (error) throw error;
      return customerId;
    },
    onSuccess: (customerId) => {
      queryClient.invalidateQueries({ queryKey: ["customer-contacts", customerId] });
      toast({ title: "Contato removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover contato", description: error.message, variant: "destructive" });
    },
  });
}
