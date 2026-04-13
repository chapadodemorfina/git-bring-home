import {
  createPdf, addHeader, addSection, addField, addTable, addTotalBox, savePdf,
  fetchImageAsDataUrl, formatCurrency, formatDate,
  type CompanyInfo,
} from "@/lib/pdf-utils";

interface PeriodData {
  collection_point_name: string;
  period_start: string;
  period_end: string;
  completed_orders: number;
  total_orders: number;
  total_revenue: number;
  commission_amount: number;
  status: string;
  commission_type?: string;
  commission_value?: number;
}

interface OrderRow {
  order_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  paid: "Paga",
};

const osStatusLabels: Record<string, string> = {
  received: "Recebido",
  in_diagnosis: "Em Diagnóstico",
  waiting_approval: "Aguardando Aprovação",
  approved: "Aprovado",
  in_repair: "Em Reparo",
  waiting_parts: "Aguardando Peças",
  repaired: "Reparado",
  quality_check: "Controle de Qualidade",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const commissionTypeLabels: Record<string, string> = {
  percentage: "Percentual",
  fixed_per_order: "Fixo por OS",
  fixed_per_device: "Fixo por Equipamento",
};

export async function generateCpCommissionReportPdf(
  period: PeriodData,
  orders: OrderRow[],
  company: CompanyInfo | string,
) {
  const doc = createPdf("portrait");

  // Try to load logo
  let logoDataUrl: string | null = null;
  if (typeof company !== "string" && company.logoUrl) {
    logoDataUrl = await fetchImageAsDataUrl(company.logoUrl);
  }

  const periodLabel = `${formatDate(period.period_start)} a ${formatDate(period.period_end)}`;
  let y = addHeader(doc, company, "Relatório de Comissão — Parceiro", statusLabels[period.status] || period.status, logoDataUrl);

  // Partner info section
  y = addSection(doc, "Dados do Parceiro", y);
  const col2 = 110;
  const y0 = y;
  y = addField(doc, "Parceiro", period.collection_point_name, 14, y);
  y = addField(doc, "Período", periodLabel, 14, y);

  let yr = y0;
  if (period.commission_type) {
    yr = addField(doc, "Tipo de Comissão", commissionTypeLabels[period.commission_type] || period.commission_type, col2, yr);
  }
  if (period.commission_value !== undefined && period.commission_value !== null) {
    const valueStr = period.commission_type === "percentage"
      ? `${period.commission_value}%`
      : formatCurrency(period.commission_value);
    yr = addField(doc, "Valor/Taxa", valueStr, col2, yr);
  }
  y = Math.max(y, yr) + 2;

  // Summary cards
  y = addSection(doc, "Resumo do Período", y);
  doc.setFontSize(9);

  const summaryItems = [
    { label: "OS Concluídas", value: String(period.completed_orders), color: [37, 99, 235] as [number, number, number] },
    { label: "Faturamento Total", value: formatCurrency(period.total_revenue), color: [22, 163, 74] as [number, number, number] },
    { label: "Comissão a Repassar", value: formatCurrency(period.commission_amount), color: [234, 88, 12] as [number, number, number] },
  ];

  let sx = 14;
  summaryItems.forEach((item) => {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(item.label.toUpperCase(), sx, y);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...item.color);
    doc.text(item.value, sx, y + 6);
    doc.setFont("helvetica", "normal");
    sx += 62;
  });
  y += 14;

  // Orders table
  y = addSection(doc, "Ordens de Serviço no Período", y);

  if (orders.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Nenhuma ordem de serviço encontrada para este período.", 14, y);
    y += 6;
  } else {
    y = addTable(
      doc,
      y,
      ["Nº OS", "Cliente", "Status", "Valor (R$)"],
      orders.map((o) => [
        o.order_number || "—",
        o.customer_name || "—",
        osStatusLabels[o.status] || o.status,
        formatCurrency(o.total_amount),
      ]),
      {
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: "auto" as any },
          2: { cellWidth: 35 },
          3: { cellWidth: 30, halign: "right" as const },
        },
      },
    );
  }

  // Totals
  y += 2;
  y = addTotalBox(doc, y, [
    { label: "OS Concluídas", value: String(period.completed_orders) },
    { label: "Faturamento", value: formatCurrency(period.total_revenue) },
    { label: "Comissão", value: formatCurrency(period.commission_amount), bold: true, color: [234, 88, 12] },
  ]);

  // Save
  const safeName = period.collection_point_name.replace(/[^a-zA-Z0-9]/g, "_");
  const safeStart = period.period_start.replace(/-/g, "");
  const safeEnd = period.period_end.replace(/-/g, "");
  savePdf(doc, `Comissao_${safeName}_${safeStart}_${safeEnd}`, company);
}
