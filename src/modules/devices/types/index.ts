import { z } from "zod";

export type DeviceType =
  | "notebook" | "desktop_pc" | "monitor" | "tv" | "smartphone"
  | "tablet" | "printer" | "electronic_module" | "motherboard" | "other";

export const deviceTypeLabels: Record<DeviceType, string> = {
  notebook: "Notebook",
  desktop_pc: "Desktop PC",
  monitor: "Monitor",
  tv: "TV",
  smartphone: "Smartphone",
  tablet: "Tablet",
  printer: "Impressora",
  electronic_module: "Módulo Eletrônico",
  motherboard: "Placa-mãe",
  other: "Outro",
};

export interface Device {
  id: string;
  customer_id: string;
  device_type: DeviceType;
  custom_device_type: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  imei: string | null;
  color: string | null;
  password_notes: string | null;
  physical_condition: string | null;
  reported_issue: string | null;
  internal_notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customer_name?: string;
}

/** Returns the display label for a device, considering custom types */
export function getDeviceTypeLabel(device: Pick<Device, 'device_type' | 'custom_device_type'>): string {
  if (device.device_type === 'other' && device.custom_device_type) {
    return device.custom_device_type;
  }
  return deviceTypeLabels[device.device_type] ?? device.device_type;
}

export interface DeviceAccessory {
  id: string;
  device_id: string;
  name: string;
  delivered: boolean;
  notes: string | null;
  created_at: string;
}

export interface DevicePhoto {
  id: string;
  device_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const deviceSchema = z.object({
  customer_id: z.string().uuid("Selecione um cliente"),
  device_type: z.enum([
    "notebook", "desktop_pc", "monitor", "tv", "smartphone",
    "tablet", "printer", "electronic_module", "motherboard", "other",
  ] as const),
  custom_device_type: z.string().trim().max(100).optional().or(z.literal("")),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  model: z.string().trim().max(100).optional().or(z.literal("")),
  serial_number: z.string().trim().max(100).optional().or(z.literal("")),
  imei: z.string().trim().max(20).optional().or(z.literal("")),
  color: z.string().trim().max(50).optional().or(z.literal("")),
  password_notes: z.string().trim().max(500).optional().or(z.literal("")),
  physical_condition: z.string().trim().max(2000).optional().or(z.literal("")),
  reported_issue: z.string().trim().max(2000).optional().or(z.literal("")),
  internal_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;

export const accessorySchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  delivered: z.boolean().default(false),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export type AccessoryFormData = z.infer<typeof accessorySchema>;

export const defaultAccessories = [
  "Carregador / Fonte",
  "Cabo de Energia",
  "Mouse",
  "Teclado",
  "Mochila / Case",
  "Bateria",
  "Cabo HDMI",
  "Controle Remoto",
  "Caneta Stylus",
  "Capa Protetora",
];
