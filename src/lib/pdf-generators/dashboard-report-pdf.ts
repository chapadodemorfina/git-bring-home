import {
  createPdf, addHeader, addSection, addField, addTable, savePdf,
  formatCurrency,
  type CompanyInfo,
} from "@/lib/pdf-utils";
import { statusLabels } from "@/modules/service-orders/types";
import type { DashboardSummary } from "@/hooks/useDashboardData";

export function generateDashboardReportPdf(
  summary: DashboardSummary,
  company: CompanyInfo | string,
  dateLabel: string
) {
  const doc = createPdf("landscape");
  let y = addHeader(doc, company, "Relatório Executivo do Dashboard", dateLabel);

  // KPIs section
  y = addSection(doc, "Indicadores Principais", y);
  const col1 = 14;
  const col2 = 80;
  const col3 = 150;
  const col4 = 220;

  y = addField(doc, "Total de OS", String(summary.total_orders), col1, y);
  addField(doc, "OS em Aberto", String(summary.open_orders), col2, y - 8);
  addField(doc, "SLA Excedido", String(summary.sla_overdue_count), col3, y - 8);
  addField(doc, "Recebidos Hoje", String(summary.today_received), col4, y - 8);

  y += 4;
  y = addField(doc, "Receita", formatCurrency(Number(summary.total_revenue)), col1, y);
  addField(doc, "Despesas", formatCurrency(Number(summary.total_expenses)), col2, y - 8);
  const profit = Number(summary.total_revenue) - Number(summary.total_expenses);
  addField(doc, "Lucro", formatCurrency(profit), col3, y - 8);
  addField(doc, "Ticket Médio", summary.avg_ticket_value ? formatCurrency(Number(summary.avg_ticket_value)) : "—", col4, y - 8);

  y += 4;
  y = addField(doc, "Orçamentos Enviados", String(summary.quotes_total), col1, y);
  addField(doc, "Aprovados", String(summary.quotes_approved), col2, y - 8);
  const approvalRate = summary.quotes_total > 0 ? Math.round((summary.quotes_approved / summary.quotes_total) * 100) : 0;
  addField(doc, "Taxa Aprovação", `${approvalRate}%`, col3, y - 8);
  addField(doc, "Tempo Médio (h)", summary.avg_turnaround_hours ? `${Math.round(summary.avg_turnaround_hours)}h` : "—", col4, y - 8);

  // Status breakdown — translate keys
  y += 6;
  y = addSection(doc, "OS por Status", y);
  const statusEntries = Object.entries(summary.orders_by_status || {});
  if (statusEntries.length > 0) {
    y = addTable(doc, y, ["Status", "Quantidade"],
      statusEntries.map(([s, c]) => [
        statusLabels[s as keyof typeof statusLabels] || s,
        c,
      ])
    );
  }

  // Technician productivity
  if ((summary.technician_orders || []).length > 0) {
    y += 4;
    y = addSection(doc, "Produtividade por Técnico", y);
    y = addTable(doc, y, ["Técnico", "OS Atendidas"], summary.technician_orders.map(t => [t.name || t.technician_id.slice(0, 8), t.count]));
  }

  // Monthly trend
  if ((summary.monthly_trend || []).length > 0) {
    y += 4;
    y = addSection(doc, "Tendência Mensal", y);
    y = addTable(doc, y, ["Mês", "OS", "Receita", "Despesas", "Lucro"], summary.monthly_trend.map(m => [
      m.month, m.orders, formatCurrency(m.revenue), formatCurrency(m.expenses), formatCurrency(m.profit),
    ]));
  }

  // Top parts
  if ((summary.top_parts || []).length > 0) {
    y += 4;
    y = addSection(doc, "Peças Mais Consumidas", y);
    y = addTable(doc, y, ["Peça", "SKU", "Qtd", "Custo Total"], summary.top_parts.map(p => [
      p.name, p.sku, p.qty, formatCurrency(p.cost),
    ]));
  }

  savePdf(doc, `relatorio-dashboard-${new Date().toISOString().slice(0, 10)}`, company);
}
