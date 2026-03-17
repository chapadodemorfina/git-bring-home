import {
  createPdf, addHeader, addSection, addTable, savePdf,
  formatCurrency, formatDate,
} from "@/lib/pdf-utils";

interface FinancialEntry {
  description: string;
  entry_type: string;
  status: string;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  category: string | null;
  customer_name?: string;
  supplier_name?: string;
  order_number?: string;
}

const typeMap: Record<string, string> = { revenue: "Receita", expense: "Despesa", commission: "Comissão" };
const statusMap: Record<string, string> = { pending: "Pendente", partial: "Parcial", paid: "Pago", overdue: "Vencido", cancelled: "Cancelado" };

export function generateFinancialReportPdf(
  entries: FinancialEntry[],
  companyName: string,
  periodLabel?: string
) {
  const doc = createPdf("landscape");
  let y = addHeader(doc, companyName, "Relatório Financeiro", periodLabel || "Todos os lançamentos");

  // Summary
  const revenue = entries.filter(e => e.entry_type === "revenue").reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter(e => e.entry_type === "expense").reduce((s, e) => s + e.amount, 0);
  const commissions = entries.filter(e => e.entry_type === "commission").reduce((s, e) => s + e.amount, 0);
  const profit = revenue - expenses - commissions;
  const totalPaid = entries.reduce((s, e) => s + e.paid_amount, 0);
  const totalPending = entries
    .filter(e => ["pending", "partial", "overdue"].includes(e.status))
    .reduce((s, e) => s + (e.amount - e.paid_amount), 0);

  y = addSection(doc, "Resumo", y);
  
  doc.setFontSize(9);
  const summaryItems = [
    { label: "Receitas", value: formatCurrency(revenue), color: [22, 163, 74] as [number, number, number] },
    { label: "Despesas", value: formatCurrency(expenses), color: [220, 38, 38] as [number, number, number] },
    { label: "Comissões", value: formatCurrency(commissions), color: [147, 51, 234] as [number, number, number] },
    { label: "Lucro", value: formatCurrency(profit), color: profit >= 0 ? [22, 163, 74] as [number, number, number] : [220, 38, 38] as [number, number, number] },
    { label: "Total Pago", value: formatCurrency(totalPaid), color: [37, 99, 235] as [number, number, number] },
    { label: "Saldo Pendente", value: formatCurrency(totalPending), color: [245, 158, 11] as [number, number, number] },
  ];

  let sx = 14;
  summaryItems.forEach((item) => {
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, sx, y);
    doc.setFontSize(10);
    doc.setTextColor(...item.color);
    doc.text(item.value, sx, y + 5);
    doc.setFontSize(9);
    sx += 45;
  });

  y += 14;

  // Table
  y = addTable(doc, y,
    ["Descrição", "Tipo", "Status", "Referência", "Categoria", "Vencimento", "Valor", "Pago", "Saldo"],
    entries.map((e) => [
      e.description.substring(0, 40),
      typeMap[e.entry_type] || e.entry_type,
      statusMap[e.status] || e.status,
      e.order_number || e.customer_name || e.supplier_name || "—",
      e.category || "—",
      formatDate(e.due_date),
      formatCurrency(e.amount),
      formatCurrency(e.paid_amount),
      formatCurrency(e.amount - e.paid_amount),
    ]),
    {
      columnStyles: {
        0: { cellWidth: 50 },
        6: { halign: "right" },
        7: { halign: "right" },
        8: { halign: "right" },
      },
    }
  );

  // Totals row
  y += 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const pw = doc.internal.pageSize.getWidth();
  doc.text("TOTAIS:", 14, y);
  doc.text(formatCurrency(entries.reduce((s, e) => s + e.amount, 0)), pw - 60, y, { align: "right" });
  doc.text(formatCurrency(totalPaid), pw - 35, y, { align: "right" });
  doc.text(formatCurrency(totalPending), pw - 14, y, { align: "right" });
  doc.setFont("helvetica", "normal");

  savePdf(doc, `Relatorio_Financeiro_${formatDate(new Date().toISOString()).replace(/\//g, "-")}`);
}
