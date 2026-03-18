import {
  createPdf, addHeader, addSection, addField, addTable, savePdf,
  formatCurrency, formatDate, formatDateTime,
} from "@/lib/pdf-utils";
import { statusLabels } from "@/modules/service-orders/types";

interface ServiceOrderData {
  order_number: string;
  status: string;
  priority: string;
  intake_channel: string;
  created_at: string;
  expected_deadline?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  device_label?: string;
  device_serial?: string | null;
  device_imei?: string | null;
  device_color?: string | null;
  reported_issue?: string | null;
  physical_condition?: string | null;
  accessories_received?: string | null;
  intake_notes?: string | null;
  technician_name?: string;
  collection_point_name?: string | null;
}

interface StatusEntry {
  from_status: string | null;
  to_status: string;
  notes: string | null;
  created_at: string;
}

const priorityMap: Record<string, string> = {
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
};
const channelMap: Record<string, string> = {
  front_desk: "Balcão", collection_point: "Ponto de Coleta", whatsapp: "WhatsApp",
  phone: "Telefone", email: "E-mail", website: "Website",
};

function formatPhysicalCondition(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      const statusMap: Record<string, string> = {
        ok: "OK", damaged: "Danificado", scratched: "Arranhado", cracked: "Trincado", missing: "Ausente",
      };
      return items
        .map((item: any) => {
          const name = (item.id || item.name || "").replace(/_/g, " ");
          const label = name.charAt(0).toUpperCase() + name.slice(1);
          const status = statusMap[item.status] || item.status || "";
          const notes = item.notes ? ` (${item.notes})` : "";
          return `${label}: ${status}${notes}`;
        })
        .join(" | ");
    }
  } catch {
    // not JSON, return as-is
  }
  return raw;
}

export function generateServiceOrderPdf(
  order: ServiceOrderData,
  statusHistory: StatusEntry[],
  companyName: string
) {
  const doc = createPdf();
  let y = addHeader(doc, companyName, `Ordem de Serviço: ${order.order_number}`, 
    `Status: ${statusLabels[order.status as keyof typeof statusLabels] || order.status}`);

  // Customer & Device section
  y = addSection(doc, "Dados do Cliente e Dispositivo", y);
  const col1 = 14;
  const col2 = 110;

  y = addField(doc, "Cliente", order.customer_name, col1, y);
  addField(doc, "Telefone", order.customer_phone, col2, y - 8);

  y = addField(doc, "Dispositivo", order.device_label, col1, y + 2);
  if (order.device_serial) addField(doc, "Serial", order.device_serial, col2, y - 8);
  if (order.device_imei) y = addField(doc, "IMEI", order.device_imei, col1, y + 2);
  if (order.device_color) addField(doc, "Cor", order.device_color, col2, y - 8);

  y += 4;

  // Order info
  y = addSection(doc, "Informações da OS", y);
  y = addField(doc, "Prioridade", priorityMap[order.priority] || order.priority, col1, y);
  addField(doc, "Canal de Entrada", channelMap[order.intake_channel] || order.intake_channel, col2, y - 8);
  y = addField(doc, "Data de Criação", formatDateTime(order.created_at), col1, y + 2);
  if (order.expected_deadline) addField(doc, "Prazo Estimado", formatDateTime(order.expected_deadline), col2, y - 8);
  if (order.technician_name) y = addField(doc, "Técnico", order.technician_name, col1, y + 2);
  if (order.collection_point_name) addField(doc, "Ponto de Coleta", order.collection_point_name, col2, y - 8);

  y += 4;

  // Problem details
  if (order.reported_issue || order.physical_condition || order.accessories_received) {
    y = addSection(doc, "Detalhes do Serviço", y);
    if (order.reported_issue) y = addField(doc, "Problema Relatado", order.reported_issue, col1, y, 170);
    if (order.physical_condition) y = addField(doc, "Condição Física", formatPhysicalCondition(order.physical_condition), col1, y + 2, 170);
    if (order.accessories_received) y = addField(doc, "Acessórios", order.accessories_received, col1, y + 2, 170);
    if (order.intake_notes) y = addField(doc, "Observações", order.intake_notes, col1, y + 2, 170);
    y += 4;
  }

  // Status History
  if (statusHistory?.length) {
    y = addSection(doc, "Histórico de Status", y);
    y = addTable(doc, y, ["Data/Hora", "De", "Para", "Observações"], 
      statusHistory.map((h) => [
        formatDateTime(h.created_at),
        h.from_status ? (statusLabels[h.from_status as keyof typeof statusLabels] || h.from_status) : "—",
        statusLabels[h.to_status as keyof typeof statusLabels] || h.to_status,
        h.notes || "—",
      ])
    );
  }

  savePdf(doc, `OS_${order.order_number}`);
}
