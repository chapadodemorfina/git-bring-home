import {
  createPdf, addHeader, addSection, addField, addTable, addTotalBox,
  savePdf, fetchImageAsDataUrl,
  formatCurrency, formatDateTime,
  type CompanyInfo,
  DEFAULT_THEME,
} from "@/lib/pdf-utils";

export interface PaymentReceiptData {
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerDocument?: string | null;
  deviceLabel?: string;
  totalAmount: number;
  entries: {
    description: string;
    amount: number;
    paidAmount: number;
    status: string;
    isPrimary: boolean;
  }[];
  payments: {
    amount: number;
    method: string;
    paidAt: string;
    notes?: string | null;
  }[];
}

const statusMap: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  cancelled: "Cancelado",
  overdue: "Vencido",
};

const methodMap: Record<string, string> = {
  money: "Dinheiro",
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  bank_transfer: "Transferência",
  check: "Cheque",
  boleto: "Boleto",
  other: "Outro",
};

export async function generatePaymentReceiptPdf(
  data: PaymentReceiptData,
  company: CompanyInfo,
) {
  const doc = createPdf("portrait");
  const logoDataUrl = company.logoUrl ? await fetchImageAsDataUrl(company.logoUrl) : null;

  let y = addHeader(doc, company, "Recibo de Pagamento", `OS ${data.orderNumber}`, logoDataUrl);

  // Customer info
  y = addSection(doc, "Dados do Cliente", y);
  y = addField(doc, "Cliente", data.customerName, 16, y);
  if (data.customerDocument) y = addField(doc, "CPF/CNPJ", data.customerDocument, 16, y);
  if (data.customerPhone) y = addField(doc, "Telefone", data.customerPhone, 16, y);
  if (data.deviceLabel) y = addField(doc, "Aparelho", data.deviceLabel, 16, y);

  // OS info
  y = addSection(doc, "Ordem de Serviço", y);
  y = addField(doc, "Nº da OS", data.orderNumber, 16, y);
  y = addField(doc, "Valor Total da OS", formatCurrency(data.totalAmount), 16, y);

  // Payments table
  if (data.payments.length > 0) {
    y = addSection(doc, "Pagamentos Realizados", y);
    y = addTable(doc, y,
      ["Data/Hora", "Método", "Valor", "Observações"],
      data.payments.map((p) => [
        formatDateTime(p.paidAt),
        methodMap[p.method] || p.method,
        formatCurrency(p.amount),
        p.notes || "—",
      ]),
      { columnStyles: { 2: { halign: "right" as const } } }
    );
  }

  // Totals
  const totalPaid = data.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, data.totalAmount - totalPaid);

  const totalLines: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[] = [
    { label: "Valor da OS", value: formatCurrency(data.totalAmount) },
    { label: "Total Pago", value: formatCurrency(totalPaid), bold: true, color: DEFAULT_THEME.success },
  ];
  if (remaining > 0) {
    totalLines.push({ label: "Saldo Pendente", value: formatCurrency(remaining), color: DEFAULT_THEME.danger });
  } else {
    totalLines.push({ label: "Situação", value: "QUITADO", bold: true, color: DEFAULT_THEME.success });
  }
  y = addTotalBox(doc, y, totalLines);

  savePdf(doc, `Recibo_OS_${data.orderNumber}`, company);
}
