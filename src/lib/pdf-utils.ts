import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Theme ────────────────────────────────────────────────────
export interface PdfTheme {
  primary: [number, number, number];
  primaryLight: [number, number, number];
  headerBg: [number, number, number];
  textColor: [number, number, number];
  mutedText: [number, number, number];
  accent: [number, number, number];
  success: [number, number, number];
  danger: [number, number, number];
  cardBg: [number, number, number];
  divider: [number, number, number];
}

const THEME: PdfTheme = {
  primary: [37, 99, 235],
  primaryLight: [219, 234, 254],
  headerBg: [241, 245, 249],
  textColor: [15, 23, 42],
  mutedText: [100, 116, 139],
  accent: [147, 51, 234],
  success: [22, 163, 74],
  danger: [220, 38, 38],
  cardBg: [248, 250, 252],
  divider: [226, 232, 240],
};

export { THEME as DEFAULT_THEME };

// ─── Company Info interface ───────────────────────────────────
export interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
}

// ─── Create PDF ───────────────────────────────────────────────
export function createPdf(orientation: "portrait" | "landscape" = "portrait") {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  return doc;
}

// ─── Professional Header with company info ────────────────────
export function addHeader(
  doc: jsPDF,
  company: CompanyInfo | string,
  title: string,
  subtitle?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const t = THEME;

  // Normalize company info
  const info: CompanyInfo = typeof company === "string"
    ? { name: company, cnpj: "", address: "", phone: "", email: "", logoUrl: "" }
    : company;

  const companyName = info.name || "Assistência Técnica";

  // Header background strip
  doc.setFillColor(...t.primary);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Company name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.primary);
  doc.text(companyName, 14, 16);

  // Company details line
  const details: string[] = [];
  if (info.cnpj) details.push(`CNPJ: ${info.cnpj}`);
  if (info.phone) details.push(`Tel: ${info.phone}`);
  if (info.email) details.push(info.email);

  if (details.length > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(details.join("  ·  "), 14, 21);
  }

  if (info.address) {
    doc.setFontSize(7);
    doc.setTextColor(...t.mutedText);
    doc.text(info.address, 14, details.length > 0 ? 25 : 21);
  }

  const infoLines = (details.length > 0 ? 1 : 0) + (info.address ? 1 : 0);
  const titleY = 16 + infoLines * 4 + 8;

  // Right side date
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.setFontSize(8);
  doc.setTextColor(...t.mutedText);
  doc.text(dateStr, pageWidth - 14, 16, { align: "right" });

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.textColor);
  doc.text(title, 14, titleY);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(subtitle, 14, titleY + 5);
  }

  // Divider line
  const dividerY = titleY + (subtitle ? 8 : 4);
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.6);
  doc.line(14, dividerY, pageWidth - 14, dividerY);

  return dividerY + 6;
}

// ─── Section Title ────────────────────────────────────────────
export function addSection(doc: jsPDF, title: string, y: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primary);
  doc.text(title, 14, y);

  // Subtle underline
  doc.setDrawColor(...THEME.primaryLight);
  doc.setLineWidth(0.3);
  doc.line(14, y + 1.5, 80, y + 1.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  return y + 7;
}

// ─── Field (label + value) ────────────────────────────────────
export function addField(
  doc: jsPDF,
  label: string,
  value: string | null | undefined,
  x: number,
  y: number,
  maxWidth = 80
): number {
  if (!value) return y;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, x, y + 4);
  return y + 4 + lines.length * 4;
}

// ─── Highlighted Field (for IMEI, totals, etc.) ───────────────
export function addHighlightedField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width = 80
): number {
  doc.setFillColor(...THEME.primaryLight);
  doc.roundedRect(x, y - 3, width, 12, 1, 1, "F");
  doc.setFontSize(7);
  doc.setTextColor(...THEME.primary);
  doc.text(label.toUpperCase(), x + 3, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(value, x + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  return y + 13;
}

// ─── Card-like block ──────────────────────────────────────────
export function addCard(
  doc: jsPDF,
  y: number,
  height: number,
  drawContent: (innerY: number) => number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.roundedRect(14, y, pageWidth - 28, height, 2, 2, "FD");
  return drawContent(y + 4);
}

// ─── Table ────────────────────────────────────────────────────
export function addTable(
  doc: jsPDF,
  startY: number,
  head: string[],
  body: (string | number)[][],
  options?: Partial<Parameters<typeof autoTable>[1]>
) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: THEME.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: THEME.textColor,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: {
      cellPadding: 2.5,
      lineWidth: 0.1,
      lineColor: THEME.divider,
    },
    ...options,
  });

  return (doc as any).lastAutoTable?.finalY || startY + 20;
}

// ─── Total Box ────────────────────────────────────────────────
export function addTotalBox(
  doc: jsPDF,
  y: number,
  lines: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = 80;
  const boxX = pageWidth - 14 - boxWidth;
  const boxHeight = lines.length * 6 + 8;

  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, "FD");

  let ly = y + 5;
  lines.forEach((line) => {
    doc.setFontSize(line.bold ? 10 : 8);
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setTextColor(...(line.color || THEME.textColor));
    doc.text(line.label, boxX + 4, ly);
    doc.text(line.value, boxX + boxWidth - 4, ly, { align: "right" });
    ly += 6;
  });

  return y + boxHeight + 4;
}

// ─── Professional Footer ──────────────────────────────────────
export function addFooter(doc: jsPDF, company?: CompanyInfo | string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const companyName = typeof company === "string"
    ? company
    : (company?.name || "");

  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    doc.setFontSize(6.5);
    doc.setTextColor(...THEME.mutedText);

    // Left: Company
    if (companyName) {
      doc.text(companyName, 14, pageHeight - 10);
    }

    // Center: generation info
    doc.text(
      `Documento gerado em ${dateStr} · i9 Sistema de Gestão`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Right: pagination
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 10,
      { align: "right" }
    );
  }
}

// ─── Save PDF ─────────────────────────────────────────────────
export function savePdf(doc: jsPDF, filename: string, company?: CompanyInfo | string) {
  addFooter(doc, company);
  doc.save(`${filename}.pdf`);
}

// ─── Formatting helpers ───────────────────────────────────────
export function formatCurrency(value: number | null | undefined): string {
  return `R$ ${(value || 0).toFixed(2).replace(".", ",")}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

// ─── Checklist helpers ────────────────────────────────────────
export function addChecklistTable(
  doc: jsPDF,
  y: number,
  items: { label: string; checked: boolean; notes?: string }[],
  title?: string
): number {
  if (title) {
    y = addSection(doc, title, y);
  }

  return addTable(
    doc,
    y,
    ["Item", "Status", "Observações"],
    items.map((item) => [
      item.label,
      item.checked ? "✔ OK" : "✖ Avariado",
      item.notes || "—",
    ]),
    {
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: "auto" },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: THEME.textColor,
      },
      didParseCell: (data: any) => {
        if (data.column.index === 1 && data.section === "body") {
          const text = data.cell.raw as string;
          if (text.startsWith("✔")) {
            data.cell.styles.textColor = THEME.success;
            data.cell.styles.fontStyle = "bold";
          } else if (text.startsWith("✖")) {
            data.cell.styles.textColor = THEME.danger;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    }
  );
}

// ─── Signature block ──────────────────────────────────────────
export function addSignatureBlock(
  doc: jsPDF,
  y: number,
  signatures: { name: string; role: string; imageData?: string }[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check if we need a new page
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  const slotWidth = (pageWidth - 28) / Math.max(signatures.length, 2);

  signatures.forEach((sig, i) => {
    const x = 14 + i * slotWidth;
    const centerX = x + slotWidth / 2;

    // Signature image
    if (sig.imageData) {
      try {
        doc.addImage(sig.imageData, "PNG", centerX - 30, y, 60, 20);
      } catch {
        // If image fails, leave blank space
      }
    }

    // Line
    doc.setDrawColor(...THEME.textColor);
    doc.setLineWidth(0.3);
    doc.line(x + 5, y + 22, x + slotWidth - 5, y + 22);

    // Name and role
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...THEME.textColor);
    doc.text(sig.name || "____________________________", centerX, y + 27, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.mutedText);
    doc.text(sig.role, centerX, y + 31, { align: "center" });
  });

  return y + 36;
}

// ─── Watermark ────────────────────────────────────────────────
export function addWatermark(doc: jsPDF, text: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "bold");

    // Rotate text diagonally
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.text(text, centerX, centerY, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();
  }
}

// ─── QR Code placeholder (for jsPDF, we add as image) ─────────
export function addQrCodeBlock(
  doc: jsPDF,
  y: number,
  qrImageData: string | null,
  label: string
): number {
  if (!qrImageData) return y;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  const centerX = pageWidth / 2;

  try {
    doc.addImage(qrImageData, "PNG", centerX - 20, y, 40, 40);
  } catch {
    return y;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.mutedText);
  doc.text(label, centerX, y + 44, { align: "center" });

  return y + 50;
}

// ─── Terms block ──────────────────────────────────────────────
export function addTermsBlock(
  doc: jsPDF,
  y: number,
  title: string,
  content: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 28;

  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  y = addSection(doc, title, y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);

  const lines = doc.splitTextToSize(content, maxWidth);

  // Check if we need multi-page
  const lineHeight = 3;
  const linesPerPage = Math.floor((pageHeight - y - 20) / lineHeight);

  if (lines.length <= linesPerPage) {
    doc.text(lines, 14, y);
    return y + lines.length * lineHeight + 4;
  }

  // Multi-page terms
  let currentLine = 0;
  while (currentLine < lines.length) {
    const availableLines = Math.floor((pageHeight - y - 20) / lineHeight);
    const chunk = lines.slice(currentLine, currentLine + availableLines);
    doc.text(chunk, 14, y);
    currentLine += availableLines;
    if (currentLine < lines.length) {
      doc.addPage();
      y = 20;
    } else {
      y += chunk.length * lineHeight + 4;
    }
  }

  return y;
}

export { autoTable };
