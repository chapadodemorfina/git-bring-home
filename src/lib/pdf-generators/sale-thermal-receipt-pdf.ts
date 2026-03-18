import { formatCurrency, formatDateTime, type CompanyInfo } from "@/lib/pdf-utils";
import type { Sale, SaleItem, SalePayment } from "@/modules/sales/types";
import { paymentMethodLabels, saleStatusLabels } from "@/modules/sales/types";
import jsPDF from "jspdf";

/**
 * Generates a thermal receipt (80mm width ≈ 72mm printable area)
 * Uses a narrow page format suitable for POS printers.
 */
export function generateSaleThermalReceiptPdf(
  sale: Sale,
  items: SaleItem[],
  payments: SalePayment[],
  company: CompanyInfo | string,
) {
  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  const info: CompanyInfo = typeof company === "string"
    ? { name: company, cnpj: "", address: "", phone: "", email: "", logoUrl: "" }
    : company;

  const companyName = info.name || "Assistência Técnica";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidth, 297],
  });

  doc.setFont("courier");
  let y = 6;

  // Company name centered
  doc.setFontSize(10);
  doc.setFont("courier", "bold");
  doc.text(companyName, pageWidth / 2, y, { align: "center" });
  y += 4;

  // Company details
  if (info.cnpj) {
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    doc.text(`CNPJ: ${info.cnpj}`, pageWidth / 2, y, { align: "center" });
    y += 3;
  }
  if (info.phone) {
    doc.setFontSize(7);
    doc.text(`Tel: ${info.phone}`, pageWidth / 2, y, { align: "center" });
    y += 3;
  }
  if (info.address) {
    doc.setFontSize(6);
    const addrLines = doc.splitTextToSize(info.address, contentWidth);
    addrLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, y, { align: "center" });
      y += 2.5;
    });
    y += 1;
  }

  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.text("COMPROVANTE DE VENDA", pageWidth / 2, y, { align: "center" });
  y += 4;

  // Separator
  doc.text("─".repeat(Math.floor(contentWidth / 1.8)), margin, y);
  y += 4;

  // Sale info
  const addLine = (label: string, value: string) => {
    doc.setFont("courier", "bold");
    doc.text(label, margin, y);
    doc.setFont("courier", "normal");
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 3.5;
  };

  addLine("Venda:", sale.sale_number);
  addLine("Data:", formatDateTime(sale.created_at));
  addLine("Cliente:", sale.customer_name || "Consumidor");
  addLine("Vendedor:", sale.seller_name || "—");
  addLine("Status:", saleStatusLabels[sale.status]);
  y += 1;

  // Items separator
  doc.text("─".repeat(Math.floor(contentWidth / 1.8)), margin, y);
  y += 3;

  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.text("ITEM", margin, y);
  doc.text("QTD", margin + 38, y, { align: "center" });
  doc.text("UNIT", margin + 50, y, { align: "right" });
  doc.text("TOTAL", pageWidth - margin, y, { align: "right" });
  y += 3;
  doc.setFont("courier", "normal");

  items.forEach((item) => {
    const nameLines = doc.splitTextToSize(item.product_name_snapshot, 36);
    doc.text(nameLines, margin, y);
    const lineOffset = Math.max(0, (nameLines.length - 1)) * 3;

    doc.text(String(item.quantity), margin + 38, y, { align: "center" });
    doc.text(formatCurrency(item.unit_price), margin + 50, y, { align: "right" });
    doc.text(formatCurrency(item.total_amount), pageWidth - margin, y, { align: "right" });
    y += 3.5 + lineOffset;

    if (Number(item.discount_amount) > 0) {
      doc.setFontSize(6);
      doc.text(`  Desc: -${formatCurrency(item.discount_amount)}`, margin, y);
      doc.setFontSize(7);
      y += 3;
    }
  });

  // Totals separator
  doc.text("─".repeat(Math.floor(contentWidth / 1.8)), margin, y);
  y += 3.5;

  doc.setFontSize(8);
  addLine("Subtotal:", formatCurrency(sale.subtotal));
  if (Number(sale.discount_amount) > 0) addLine("Desconto:", `- ${formatCurrency(sale.discount_amount)}`);
  if (Number(sale.surcharge_amount) > 0) addLine("Acréscimo:", `+ ${formatCurrency(sale.surcharge_amount)}`);

  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", margin, y);
  doc.text(formatCurrency(sale.total_amount), pageWidth - margin, y, { align: "right" });
  y += 5;

  // Payments
  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.text("─".repeat(Math.floor(contentWidth / 1.8)), margin, y);
  y += 3.5;

  doc.setFont("courier", "bold");
  doc.text("PAGAMENTOS", margin, y);
  y += 3.5;
  doc.setFont("courier", "normal");

  payments.forEach((p) => {
    addLine(paymentMethodLabels[p.payment_method], formatCurrency(p.amount));
  });

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const change = totalPaid - Number(sale.total_amount);
  if (change > 0) {
    addLine("Troco:", formatCurrency(change));
  }

  y += 2;
  doc.text("─".repeat(Math.floor(contentWidth / 1.8)), margin, y);
  y += 4;

  // Footer
  doc.setFontSize(7);
  doc.text("Obrigado pela preferência!", pageWidth / 2, y, { align: "center" });
  y += 3;
  doc.text(companyName, pageWidth / 2, y, { align: "center" });

  doc.save(`cupom-${sale.sale_number}.pdf`);
}
