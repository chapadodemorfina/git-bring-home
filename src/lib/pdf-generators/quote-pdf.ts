import {
  createPdf, addHeader, addSection, addField, addTable, addTotalBox,
  addSignatureBlock, addWatermark, savePdf,
  formatCurrency, formatDate,
  type CompanyInfo,
} from "@/lib/pdf-utils";

interface QuoteData {
  quote_number: string;
  status: string;
  total_amount: number;
  labor_cost: number;
  parts_cost: number;
  analysis_fee: number;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  order_number?: string;
  customer_name?: string;
  customer_document?: string;
  device_label?: string;
}

interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
}

const statusMap: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", approved: "Aprovado",
  rejected: "Rejeitado", expired: "Expirado",
};

export function generateQuotePdf(
  quote: QuoteData,
  items: QuoteItem[],
  company: CompanyInfo | string
) {
  const doc = createPdf();
  let y = addHeader(doc, company, `Orçamento: ${quote.quote_number}`,
    `Status: ${statusMap[quote.status] || quote.status}`);

  const col1 = 14;
  const col2 = 110;

  // Client & Order
  y = addSection(doc, "Dados do Cliente", y);
  y = addField(doc, "Cliente", quote.customer_name, col1, y);
  if (quote.customer_document) addField(doc, "CPF/CNPJ", quote.customer_document, col2, y - 8);
  y = addField(doc, "OS Vinculada", quote.order_number, col1, y + 2);
  y = addField(doc, "Dispositivo", quote.device_label, col1, y + 2);
  if (quote.expires_at) addField(doc, "Validade", formatDate(quote.expires_at), col2, y - 8);
  y += 6;

  // Items table
  if (items?.length) {
    y = addSection(doc, "Itens do Orçamento", y);
    y = addTable(doc, y,
      ["Item", "Tipo", "Qtd", "Valor Unit.", "Total"],
      items.map((item) => [
        item.description,
        item.item_type === "labor" ? "Mão de obra" : item.item_type === "part" ? "Peça" : "Serviço",
        String(item.quantity),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]),
      {
        columnStyles: {
          0: { cellWidth: 70 },
          3: { halign: "right" as const },
          4: { halign: "right" as const },
        },
      }
    );
  }

  y += 4;

  // Totals
  const totalLines: any[] = [
    { label: "Mão de Obra", value: formatCurrency(quote.labor_cost) },
    { label: "Peças", value: formatCurrency(quote.parts_cost) },
  ];
  if (quote.analysis_fee > 0) {
    totalLines.push({ label: "Taxa de Análise", value: formatCurrency(quote.analysis_fee) });
  }
  totalLines.push({ label: "TOTAL", value: formatCurrency(quote.total_amount), bold: true, color: [37, 99, 235] });

  y = addTotalBox(doc, y, totalLines);

  // Notes
  if (quote.notes) {
    y = addSection(doc, "Observações", y);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(quote.notes, 170);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // Signatures
  y = addSignatureBlock(doc, y, [
    { name: "", role: "Cliente" },
    { name: "", role: "Data" },
  ]);

  // Watermark for draft/expired
  if (quote.status === "draft") addWatermark(doc, "RASCUNHO");
  if (quote.status === "expired") addWatermark(doc, "EXPIRADO");

  savePdf(doc, `Orcamento_${quote.quote_number}`, company);
}
