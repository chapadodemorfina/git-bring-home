import {
  createPdf, addHeader, addTable, addField, addTotalBox, savePdf,
  formatCurrency, formatDateTime,
  type CompanyInfo,
} from "@/lib/pdf-utils";
import type { Sale, SaleItem, SalePayment } from "@/modules/sales/types";
import { paymentMethodLabels, saleStatusLabels } from "@/modules/sales/types";

export function generateSaleReceiptPdf(
  sale: Sale,
  items: SaleItem[],
  payments: SalePayment[],
  company: CompanyInfo | string,
) {
  const doc = createPdf("portrait");
  let y = addHeader(doc, company, "Comprovante de Venda", `Venda ${sale.sale_number}`);

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

  // Totals box
  const totalLines: any[] = [
    { label: "Subtotal", value: formatCurrency(sale.subtotal) },
  ];
  if (Number(sale.discount_amount) > 0) {
    totalLines.push({ label: "Desconto", value: `- ${formatCurrency(sale.discount_amount)}`, color: [220, 38, 38] });
  }
  if (Number(sale.surcharge_amount) > 0) {
    totalLines.push({ label: "Acréscimo", value: `+ ${formatCurrency(sale.surcharge_amount)}` });
  }
  totalLines.push({ label: "TOTAL", value: formatCurrency(sale.total_amount), bold: true, color: [37, 99, 235] });

  y = addTotalBox(doc, y, totalLines);

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

  savePdf(doc, `venda-${sale.sale_number}`, company);
}
