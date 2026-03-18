import {
  createPdf, addHeader, addSection, addTable, savePdf,
  formatCurrency, formatDateTime,
} from "@/lib/pdf-utils";

interface ClosingData {
  opened_at: string;
  closed_at: string | null;
  opened_by_name?: string;
  initial_amount: number;
  expected_amount: number | null;
  counted_amount: number | null;
  difference_amount: number | null;
  notes: string | null;
  closing_notes: string | null;
}

interface MovementRow {
  created_at: string;
  movement_type: string;
  description: string;
  payment_method: string;
  amount: number;
  created_by_name?: string;
}

interface Summary {
  cash_in: number;
  pix_in: number;
  credit_in: number;
  debit_in: number;
  withdrawals: number;
  reinforcements: number;
  expenses: number;
  total_in: number;
  total_out: number;
}

const typeMap: Record<string, string> = {
  sale: "Venda", receipt: "Recebimento", withdrawal: "Sangria",
  reinforcement: "Reforço", expense: "Despesa", adjustment: "Ajuste",
};

const payMap: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", credit_card: "Crédito", debit_card: "Débito",
};

export function generateCashRegisterClosingPdf(
  register: ClosingData,
  summary: Summary,
  movements: MovementRow[],
  companyName: string,
) {
  const doc = createPdf("portrait");
  let y = addHeader(doc, companyName, "Relatório de Fechamento de Caixa",
    `Operador: ${register.opened_by_name || "—"}`);

  // Period info
  y = addSection(doc, "Período", y);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Abertura: ${formatDateTime(register.opened_at)}`, 14, y);
  doc.text(`Fechamento: ${formatDateTime(register.closed_at)}`, 110, y);
  y += 8;

  // Summary section
  y = addSection(doc, "Resumo Financeiro", y);

  const summaryRows: [string, string][] = [
    ["Saldo Inicial", formatCurrency(register.initial_amount)],
    ["Entradas em Dinheiro", formatCurrency(summary.cash_in)],
    ["Entradas PIX", formatCurrency(summary.pix_in)],
    ["Entradas Cartão Crédito", formatCurrency(summary.credit_in)],
    ["Entradas Cartão Débito", formatCurrency(summary.debit_in)],
    ["Reforços", formatCurrency(summary.reinforcements)],
    ["Sangrias", `- ${formatCurrency(summary.withdrawals)}`],
    ["Despesas", `- ${formatCurrency(summary.expenses)}`],
  ];

  doc.setFontSize(9);
  summaryRows.forEach(([label, value]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, y);
    doc.setTextColor(15, 23, 42);
    doc.text(value, 90, y);
    y += 5;
  });

  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 180, y);
  y += 5;

  // Totals
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Saldo Esperado:", 14, y);
  doc.text(formatCurrency(register.expected_amount ?? 0), 90, y);
  y += 6;
  doc.text("Valor Contado:", 14, y);
  doc.text(formatCurrency(register.counted_amount ?? 0), 90, y);
  y += 6;

  const diff = register.difference_amount ?? 0;
  doc.text("Diferença:", 14, y);
  if (diff < 0) doc.setTextColor(220, 38, 38);
  else if (diff > 0) doc.setTextColor(22, 163, 74);
  else doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(diff), 90, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  y += 10;

  // Notes
  if (register.notes || register.closing_notes) {
    y = addSection(doc, "Observações", y);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (register.notes) {
      doc.text(`Abertura: ${register.notes}`, 14, y);
      y += 5;
    }
    if (register.closing_notes) {
      doc.text(`Fechamento: ${register.closing_notes}`, 14, y);
      y += 5;
    }
    y += 3;
  }

  // Movements table
  if (movements.length > 0) {
    y = addSection(doc, "Movimentações", y);
    y = addTable(doc, y,
      ["Horário", "Tipo", "Descrição", "Pagamento", "Valor", "Usuário"],
      movements.map((m) => [
        formatDateTime(m.created_at).split(" ")[1] || "",
        typeMap[m.movement_type] || m.movement_type,
        m.description.substring(0, 40),
        payMap[m.payment_method] || m.payment_method,
        formatCurrency(m.amount),
        m.created_by_name || "—",
      ]),
      {
        columnStyles: {
          4: { halign: "right" },
        },
      }
    );
  }

  savePdf(doc, `Fechamento_Caixa_${formatDateTime(register.closed_at || register.opened_at).replace(/[\/: ]/g, "-")}`);
}
