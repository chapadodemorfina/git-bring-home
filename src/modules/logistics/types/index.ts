import { z } from "zod";

export type LogisticsStatus =
  | "pickup_requested"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transport"
  | "received_at_lab"
  | "ready_for_return"
  | "return_scheduled"
  | "returned";

export type LogisticsType = "pickup" | "delivery" | "collection_point_transfer";

export interface PickupDelivery {
  id: string;
  service_order_id: string;
  collection_point_id: string | null;
  logistics_type: LogisticsType;
  status: LogisticsStatus;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  requested_date: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  proof_storage_path: string | null;
  proof_notes: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  order_number?: string;
  customer_name?: string;
}

export interface TransportEvent {
  id: string;
  pickup_delivery_id: string;
  from_status: LogisticsStatus | null;
  to_status: LogisticsStatus;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

export const statusLabels: Record<LogisticsStatus, string> = {
  pickup_requested: "Coleta Solicitada",
  pickup_scheduled: "Coleta Agendada",
  picked_up: "Coletado",
  in_transport: "Em Transporte",
  received_at_lab: "Recebido no Lab",
  ready_for_return: "Pronto p/ Devolução",
  return_scheduled: "Devolução Agendada",
  returned: "Devolvido",
};

export const statusColors: Record<LogisticsStatus, string> = {
  pickup_requested: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  pickup_scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  picked_up: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  in_transport: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  received_at_lab: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  ready_for_return: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  return_scheduled: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  returned: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export const typeLabels: Record<LogisticsType, string> = {
  pickup: "Coleta no Cliente",
  delivery: "Entrega ao Cliente",
  collection_point_transfer: "Transferência Ponto de Coleta",
};

export const statusTransitions: Record<LogisticsStatus, LogisticsStatus[]> = {
  pickup_requested: ["pickup_scheduled"],
  pickup_scheduled: ["picked_up"],
  picked_up: ["in_transport"],
  in_transport: ["received_at_lab"],
  received_at_lab: ["ready_for_return"],
  ready_for_return: ["return_scheduled"],
  return_scheduled: ["returned"],
  returned: [],
};

export const pickupDeliveryFormSchema = z.object({
  service_order_id: z.string().min(1, "OS obrigatória"),
  collection_point_id: z.string().optional(),
  logistics_type: z.enum(["pickup", "delivery", "collection_point_transfer"]),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  requested_date: z.string().optional(),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
});

export type PickupDeliveryFormData = z.infer<typeof pickupDeliveryFormSchema>;
