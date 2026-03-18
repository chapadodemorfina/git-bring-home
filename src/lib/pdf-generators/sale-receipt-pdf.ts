import { createPdf, addHeader, addTable, addField, savePdf, formatCurrency, formatDateTime } from "@/lib/pdf-utils";
import type { Sale, SaleItem, SalePayment } from "@/modules/sales/types";
import { paymentMethodLabels, saleStatusLabels } from "@/modules/sales/types";

export function generateSaleReceiptPdf(
  sale: Sale,
  items: SaleItem[],
  payments: SalePayment[],
  companyName: string,
) {
  const doc = createPdf("portrait");
  let y = addHeader(doc, companyName, "Comprovante de Venda", `Venda ${sale.sale_number}`);

  // Sale info
  y = addField(doc, "Número", sale.sale_number, 14, y) + 2;
  y = addField(doc, "Status", saleStatusLabels[sale.status], 14, y) + 2;
  y = addField(doc, "Cliente", sale.customer_name || "Consumidor", 14, y) + 2;
  y = addField(doc, "Vendedor", sale.seller_name || "—", 14, y) + 2;
  y = addField(doc, "Data", formatDateTime(sale.created_at), 14, y) + 4;

  // Items table
  y = addTable(doc, y,
    ["Produto", "SKU", "Qtd", "Preço Un.", "Desc.", "Total"],
    items.map((i) => [
      i.product_name_snapshot,
      i.sku_snapshot || "—",
      String(i.quantity),
      formatCurrency(i.unit_price),
      Number(i.discount_amount) > 0 ? formatCurrency(i.discount_amount) : "—",
      formatCurrency(i.total_amount),
    ])
  );

  y += 6;

  // Totals
  y = addField(doc, "Subtotal", formatCurrency(sale.subtotal), 14, y) + 2;
  if (Number(sale.discount_amount) > 0) y = addField(doc, "Desconto", `- ${formatCurrency(sale.discount_amount)}`, 14, y) + 2;
  if (Number(sale.surcharge_amount) > 0) y = addField(doc, "Acréscimo", `+ ${formatCurrency(sale.surcharge_amount)}`, 14, y) + 2;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatCurrency(sale.total_amount)}`, 14, y + 4);
  doc.setFont("helvetica", "normal");
  y += 10;

  // Payments
  if (payments.length > 0) {
    y = addTable(doc, y,
      ["Método", "Valor", "Data"],
      payments.map((p) => [
        paymentMethodLabels[p.payment_method],
        formatCurrency(p.amount),
        formatDateTime(p.paid_at),
      ])
    );
  }

  savePdf(doc, `venda-${sale.sale_number}`);
}
