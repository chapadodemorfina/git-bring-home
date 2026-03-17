import {
  createPdf, addHeader, addSection, addField, addTable, savePdf,
  formatCurrency, formatDate,
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
  companyName: string
) {
  const doc = createPdf();
  let y = addHeader(doc, companyName, `Orçamento: ${quote.quote_number}`,
    `Status: ${statusMap[quote.status] || quote.status}`);

  const col1 = 14;
  const col2 = 110;

  // Client & Order
  y = addSection(doc, "Dados do Cliente", y);
  y = addField(doc, "Cliente", quote.customer_name, col1, y);
  addField(doc, "OS", quote.order_number, col2, y - 8);
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
        item.item_type === "labor" ? "Mão de obra" : "Peça",
        String(item.quantity),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]),
      {
        columnStyles: {
          0: { cellWidth: 70 },
          3: { halign: "right" },
          4: { halign: "right" },
        },
      }
    );
  }

  y += 4;

  // Totals
  y = addSection(doc, "Resumo de Valores", y);
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 14;

  doc.setFontSize(9);
  const totals = [
    ["Mão de Obra:", formatCurrency(quote.labor_cost)],
    ["Peças:", formatCurrency(quote.parts_cost)],
  ];
  if (quote.analysis_fee > 0) totals.push(["Taxa de Análise:", formatCurrency(quote.analysis_fee)]);
  
  totals.forEach(([label, value]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, rightX - 60, y);
    doc.setTextColor(15, 23, 42);
    doc.text(value, rightX, y, { align: "right" });
    y += 5;
  });

  // Total bold
  doc.setDrawColor(200, 200, 200);
  doc.line(rightX - 60, y - 1, rightX, y - 1);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("TOTAL:", rightX - 60, y + 4);
  doc.text(formatCurrency(quote.total_amount), rightX, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");

  y += 14;

  // Notes
  if (quote.notes) {
    y = addSection(doc, "Observações", y);
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(quote.notes, 170);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // Signature area
  y += 10;
  if (y > 240) {
    doc.addPage();
    y = 30;
  }
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y + 15, 90, y + 15);
  doc.line(110, y + 15, 196, y + 15);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Assinatura do Cliente", 52, y + 20, { align: "center" });
  doc.text("Data", 153, y + 20, { align: "center" });

  savePdf(doc, `Orcamento_${quote.quote_number}`);
}
