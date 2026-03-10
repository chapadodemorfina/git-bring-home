import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  Product, Supplier, StockMovement, RepairPartUsed, PurchaseEntry,
  ProductFormData, SupplierFormData, StockEntryFormData, ConsumePartFormData,
} from "../types";

const sb = supabase as any;

// ── Products ──
export function useProducts(search?: string) {
  return useQuery<Product[]>({
    queryKey: ["products", search],
    queryFn: async () => {
      let query = sb.from("products").select("*, suppliers(id, name)").order("name");
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%,category.ilike.%${search}%,compatible_devices.ilike.%${search}%,location.ilike.%${search}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery<Product>({
    queryKey: ["products", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from("products").select("*, suppliers(*)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: ProductFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        ...values,
        supplier_id: values.supplier_id || null,
        category: values.category || null,
        brand: values.brand || null,
        compatible_devices: values.compatible_devices || null,
        location: values.location || null,
        notes: values.notes || null,
        created_by: user?.id,
      };
      const { data, error } = await sb.from("products").insert(payload).select().single();
      if (error) throw error;
      if (values.quantity > 0) {
        await sb.from("stock_movements").insert({
          product_id: data.id,
          movement_type: "entry",
          quantity: values.quantity,
          previous_quantity: 0,
          new_quantity: values.quantity,
          unit_cost: values.cost_price,
          notes: "Estoque inicial",
          created_by: user?.id,
        });
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Produto criado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProductFormData }) => {
      const payload: any = {
        ...values,
        supplier_id: values.supplier_id || null,
        category: values.category || null,
        brand: values.brand || null,
        compatible_devices: values.compatible_devices || null,
        location: values.location || null,
        notes: values.notes || null,
      };
      const { error } = await sb.from("products").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Produto atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Suppliers ──
export function useSuppliers(search?: string) {
  return useQuery<Supplier[]>({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      let query = sb.from("suppliers").select("*").order("name");
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,document.ilike.%${search}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: SupplierFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        ...values,
        contact_name: values.contact_name || null,
        email: values.email || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        document: values.document || null,
        address: values.address || null,
        notes: values.notes || null,
        created_by: user?.id,
      };
      const { data, error } = await sb.from("suppliers").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast({ title: "Fornecedor criado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SupplierFormData }) => {
      const payload: any = {
        ...values,
        contact_name: values.contact_name || null,
        email: values.email || null,
        phone: values.phone || null,
        whatsapp: values.whatsapp || null,
        document: values.document || null,
        address: values.address || null,
        notes: values.notes || null,
      };
      const { error } = await sb.from("suppliers").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast({ title: "Fornecedor atualizado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Stock Movements ──
export function useStockMovements(productId?: string) {
  return useQuery<StockMovement[]>({
    queryKey: ["stock_movements", productId],
    queryFn: async () => {
      let q = sb.from("stock_movements").select("*, products(name, sku)").order("created_at", { ascending: false }).limit(200);
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAddStockEntry() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: StockEntryFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: product, error: pErr } = await sb.from("products").select("quantity").eq("id", values.product_id).single();
      if (pErr) throw pErr;
      const prev = product.quantity;
      const newQty = prev + values.quantity;
      const { error: uErr } = await sb.from("products").update({ quantity: newQty }).eq("id", values.product_id);
      if (uErr) throw uErr;
      const { error: mErr } = await sb.from("stock_movements").insert({
        product_id: values.product_id,
        movement_type: "entry",
        quantity: values.quantity,
        previous_quantity: prev,
        new_quantity: newQty,
        unit_cost: values.unit_cost || null,
        notes: values.notes || null,
        created_by: user?.id,
      });
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast({ title: "Entrada de estoque registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Consume part for service order (ATOMIC via RPC) ──
export function useConsumePart() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ serviceOrderId, values }: { serviceOrderId: string; values: ConsumePartFormData }) => {
      const { data, error } = await sb.rpc("consume_part", {
        _service_order_id: serviceOrderId,
        _product_id: values.product_id,
        _quantity: values.quantity,
        _notes: values.notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["repair_parts_used"] });
      qc.invalidateQueries({ queryKey: ["part_reservations"] });
      toast({ title: "Peça consumida com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useRepairPartsUsed(serviceOrderId: string | undefined) {
  return useQuery<RepairPartUsed[]>({
    queryKey: ["repair_parts_used", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await sb.from("repair_parts_used").select("*, products(name, sku)").eq("service_order_id", serviceOrderId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useLowStockProducts() {
  return useQuery<Product[]>({
    queryKey: ["products", "low_stock"],
    queryFn: async () => {
      const { data, error } = await sb.from("products").select("*, suppliers(id, name)").eq("is_active", true).order("name");
      if (error) throw error;
      return (data as Product[]).filter(p => p.quantity <= p.minimum_quantity);
    },
  });
}

// ── Part Reservations ──
export interface PartReservation {
  id: string;
  product_id: string;
  service_order_id: string;
  diagnosis_id: string | null;
  quantity: number;
  status: string;
  reserved_by: string | null;
  created_at: string;
  updated_at: string;
  products?: { name: string; sku: string } | null;
}

export function usePartReservations(serviceOrderId: string | undefined) {
  return useQuery<PartReservation[]>({
    queryKey: ["part_reservations", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("part_reservations")
        .select("*, products(name, sku)")
        .eq("service_order_id", serviceOrderId!)
        .eq("status", "reserved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useReservePart() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ productId, serviceOrderId, diagnosisId, quantity }: {
      productId: string; serviceOrderId: string; diagnosisId?: string; quantity: number;
    }) => {
      const { data, error } = await sb.rpc("reserve_part", {
        _product_id: productId,
        _service_order_id: serviceOrderId,
        _diagnosis_id: diagnosisId || null,
        _quantity: quantity,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["part_reservations"] });
      toast({ title: "Peça reservada!" });
    },
    onError: (e: any) => toast({ title: "Erro ao reservar", description: e.message, variant: "destructive" }),
  });
}

export function useReleaseReservation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { data, error } = await sb.rpc("release_reservation", { _reservation_id: reservationId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["part_reservations"] });
      toast({ title: "Reserva liberada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Stock Adjustment (Manager) ──
export function useAdjustStock() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ productId, newQuantity, reason }: {
      productId: string; newQuantity: number; reason: string;
    }) => {
      const { data, error } = await sb.rpc("adjust_stock", {
        _product_id: productId,
        _new_quantity: newQuantity,
        _reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast({ title: "Estoque ajustado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Product Usage History ──
export function useProductUsageHistory(productId: string | undefined) {
  return useQuery<RepairPartUsed[]>({
    queryKey: ["product_usage", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("repair_parts_used")
        .select("*, products(name, sku)")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}
