import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Theme ────────────────────────────────────────────────────
export interface PdfTheme {
  primary: [number, number, number];
  primaryLight: [number, number, number];
  primaryDark: [number, number, number];
  headerBg: [number, number, number];
  textColor: [number, number, number];
  mutedText: [number, number, number];
  accent: [number, number, number];
  success: [number, number, number];
  successLight: [number, number, number];
  danger: [number, number, number];
  dangerLight: [number, number, number];
  warning: [number, number, number];
  warningLight: [number, number, number];
  cardBg: [number, number, number];
  divider: [number, number, number];
  white: [number, number, number];
}

const THEME: PdfTheme = {
  primary: [30, 64, 175],       // Deep professional blue
  primaryLight: [219, 234, 254],
  primaryDark: [23, 37, 84],
  headerBg: [241, 245, 249],
  textColor: [15, 23, 42],
  mutedText: [100, 116, 139],
  accent: [99, 102, 241],       // Indigo accent
  success: [21, 128, 61],
  successLight: [220, 252, 231],
  danger: [185, 28, 28],
  dangerLight: [254, 226, 226],
  warning: [161, 98, 7],
  warningLight: [254, 249, 195],
  cardBg: [248, 250, 252],
  divider: [226, 232, 240],
  white: [255, 255, 255],
};

export { THEME as DEFAULT_THEME };

const DEVELOPER_CREDIT = "Desenvolvido por Alvo Sistemas e Gestão";

// ─── Company Info interface ───────────────────────────────────
export interface CompanyInfo {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function getPageWidth(doc: jsPDF) { return doc.internal.pageSize.getWidth(); }
function getPageHeight(doc: jsPDF) { return doc.internal.pageSize.getHeight(); }
const MARGIN = 14;
function contentWidth(doc: jsPDF) { return getPageWidth(doc) - MARGIN * 2; }

/** Ensure enough vertical space; returns updated y (after page break if needed) */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > getPageHeight(doc) - 22) {
    doc.addPage();
    return 18;
  }
  return y;
}

// ─── Create PDF ───────────────────────────────────────────────
export function createPdf(orientation: "portrait" | "landscape" = "portrait") {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  return doc;
}

// ─── Premium Header ──────────────────────────────────────────
export function addHeader(
  doc: jsPDF,
  company: CompanyInfo | string,
  title: string,
  subtitle?: string
): number {
  const pw = getPageWidth(doc);
  const t = THEME;

  const info: CompanyInfo = typeof company === "string"
    ? { name: company, cnpj: "", address: "", phone: "", email: "", logoUrl: "" }
    : company;

  const companyName = info.name || "Assistência Técnica";

  // ── Top accent bar ──
  doc.setFillColor(...t.primaryDark);
  doc.rect(0, 0, pw, 3, "F");

  // ── Header background band ──
  doc.setFillColor(...t.headerBg);
  doc.rect(0, 3, pw, 28, "F");

  // ── Company name (large, bold) ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.primaryDark);
  doc.text(companyName, MARGIN, 14);

  // ── Company details (CNPJ · Tel · Email) ──
  const details: string[] = [];
  if (info.cnpj) details.push(`CNPJ: ${info.cnpj}`);
  if (info.phone) details.push(`Tel: ${info.phone}`);
  if (info.email) details.push(info.email);

  let detailY = 19;
  if (details.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(details.join("  ·  "), MARGIN, detailY);
    detailY += 4;
  }

  if (info.address) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(info.address, MARGIN, detailY);
  }

  // ── Right side: generation timestamp ──
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.setFontSize(7);
  doc.setTextColor(...t.mutedText);
  doc.text(`Emitido em ${dateStr}`, pw - MARGIN, 14, { align: "right" });

  // ── Title row (below header band) ──
  const titleY = 38;
  doc.setFillColor(...t.primary);
  doc.rect(MARGIN, titleY - 5, contentWidth(doc), 12, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.white);
  doc.text(title, MARGIN + 4, titleY + 1);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, pw - MARGIN - 4, titleY + 1, { align: "right" });
  }

  return titleY + 12;
}

// ─── Section Title (card-style) ──────────────────────────────
export function addSection(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 14);

  const pw = getPageWidth(doc);

  // Section background strip
  doc.setFillColor(...THEME.primaryLight);
  doc.rect(MARGIN, y - 3, contentWidth(doc), 8, "F");

  // Left accent bar
  doc.setFillColor(...THEME.primary);
  doc.rect(MARGIN, y - 3, 2, 8, "F");

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(title.toUpperCase(), MARGIN + 5, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  return y + 9;
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
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.mutedText);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, x, y + 3.5);
  return y + 3.5 + lines.length * 3.8;
}

// ─── Highlighted Field (IMEI, serial, etc.) ───────────────────
export function addHighlightedField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width = 80
): number {
  // Gradient-like box effect
  doc.setFillColor(...THEME.primaryLight);
  doc.roundedRect(x, y - 2, width, 11, 1.5, 1.5, "F");
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y - 2, width, 11, 1.5, 1.5, "S");

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primary);
  doc.text(label.toUpperCase(), x + 3, y + 1);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(value, x + 3, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  return y + 12;
}

// ─── Info Card Block ─────────────────────────────────────────
export function addCard(
  doc: jsPDF,
  y: number,
  height: number,
  drawContent: (innerY: number) => number
): number {
  y = ensureSpace(doc, y, height + 4);
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, contentWidth(doc), height, 2, 2, "FD");
  return drawContent(y + 3);
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
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: THEME.primaryDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: THEME.textColor,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: {
      lineWidth: 0.1,
      lineColor: THEME.divider,
      overflow: "linebreak",
    },
    ...options,
  });

  return (doc as any).lastAutoTable?.finalY || startY + 20;
}

// ─── Total Box (premium look) ─────────────────────────────────
export function addTotalBox(
  doc: jsPDF,
  y: number,
  lines: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[]
): number {
  const pw = getPageWidth(doc);
  const boxWidth = 85;
  const boxX = pw - MARGIN - boxWidth;
  const lineH = 5.5;
  const boxHeight = lines.length * lineH + 8;

  y = ensureSpace(doc, y, boxHeight + 2);

  // Shadow effect
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(boxX + 0.5, y + 0.5, boxWidth, boxHeight, 2, 2, "F");

  // Main box
  doc.setFillColor(...THEME.white);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, "FD");

  // Top accent
  doc.setFillColor(...THEME.primary);
  doc.rect(boxX, y, boxWidth, 1.5, "F");

  let ly = y + 6;
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1 && line.bold;
    if (isLast) {
      // Highlight background for total
      doc.setFillColor(...THEME.primaryLight);
      doc.rect(boxX + 1, ly - 3.5, boxWidth - 2, lineH + 1, "F");
    }
    doc.setFontSize(line.bold ? 10 : 8);
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setTextColor(...(line.color || THEME.textColor));
    doc.text(line.label, boxX + 5, ly);
    doc.text(line.value, boxX + boxWidth - 5, ly, { align: "right" });
    ly += lineH;
  });

  return y + boxHeight + 3;
}

// ─── Professional Footer ──────────────────────────────────────
export function addFooter(doc: jsPDF, company?: CompanyInfo | string) {
  const pageCount = doc.getNumberOfPages();
  const pw = getPageWidth(doc);
  const ph = getPageHeight(doc);

  const companyName = typeof company === "string"
    ? company
    : (company?.name || "");

  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider
    doc.setDrawColor(...THEME.primary);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, ph - 16, pw - MARGIN, ph - 16);

    // Row 1: Company | Date | Page
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.mutedText);

    if (companyName) {
      doc.setFont("helvetica", "bold");
      doc.text(companyName, MARGIN, ph - 12);
      doc.setFont("helvetica", "normal");
    }

    doc.text(
      `Gerado em ${dateStr}`,
      pw / 2,
      ph - 12,
      { align: "center" }
    );

    doc.text(
      `Página ${i} de ${pageCount}`,
      pw - MARGIN,
      ph - 12,
      { align: "right" }
    );

    // Row 2: Developer credit
    doc.setFontSize(5.5);
    doc.setTextColor(160, 170, 185);
    doc.text(
      DEVELOPER_CREDIT,
      pw / 2,
      ph - 8,
      { align: "center" }
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

// ─── Premium Checklist Table ──────────────────────────────────
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
      item.checked ? "OK" : "AVARIADO",
      item.notes || "—",
    ]),
    {
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 22, halign: "center" as const },
        2: { cellWidth: "auto" as any },
      },
      didParseCell: (data: any) => {
        if (data.column.index === 1 && data.section === "body") {
          const text = data.cell.raw as string;
          if (text === "OK") {
            data.cell.styles.textColor = THEME.success;
            data.cell.styles.fillColor = THEME.successLight;
            data.cell.styles.fontStyle = "bold";
          } else if (text === "AVARIADO") {
            data.cell.styles.textColor = THEME.danger;
            data.cell.styles.fillColor = THEME.dangerLight;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    }
  );
}

// ─── Signature Block (premium) ────────────────────────────────
export function addSignatureBlock(
  doc: jsPDF,
  y: number,
  signatures: { name: string; role: string; imageData?: string }[]
): number {
  const pw = getPageWidth(doc);
  y = ensureSpace(doc, y, 50);

  // Section label
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text("ASSINATURAS", pw / 2, y, { align: "center" });
  y += 4;

  const sigCount = Math.max(signatures.length, 2);
  const gap = 12;
  const slotWidth = (contentWidth(doc) - (sigCount - 1) * gap) / sigCount;

  signatures.forEach((sig, i) => {
    const x = MARGIN + i * (slotWidth + gap);
    const centerX = x + slotWidth / 2;

    // Signature box
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, slotWidth, 32, 1.5, 1.5, "FD");

    // Signature image
    if (sig.imageData) {
      try {
        const imgW = Math.min(slotWidth - 10, 55);
        doc.addImage(sig.imageData, "PNG", centerX - imgW / 2, y + 2, imgW, 16);
      } catch { /* skip broken image */ }
    }

    // Signature line
    doc.setDrawColor(...THEME.textColor);
    doc.setLineWidth(0.3);
    doc.line(x + 6, y + 21, x + slotWidth - 6, y + 21);

    // Name
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...THEME.textColor);
    doc.text(sig.name || "________________________________", centerX, y + 25, { align: "center" });

    // Role
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.mutedText);
    doc.text(sig.role, centerX, y + 29, { align: "center" });
  });

  return y + 36;
}

// ─── Watermark ────────────────────────────────────────────────
export function addWatermark(doc: jsPDF, text: string) {
  const pageCount = doc.getNumberOfPages();
  const pw = getPageWidth(doc);
  const ph = getPageHeight(doc);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "bold");
    doc.text(text, pw / 2, ph / 2, { align: "center", angle: 45 });
    doc.restoreGraphicsState();
  }
}

// ─── QR Code Block ────────────────────────────────────────────
export function addQrCodeBlock(
  doc: jsPDF,
  y: number,
  qrImageData: string | null,
  label: string
): number {
  if (!qrImageData) return y;

  const pw = getPageWidth(doc);
  y = ensureSpace(doc, y, 42);

  const centerX = pw / 2;
  const qrSize = 30;

  // Container box
  const boxW = 60;
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.2);
  doc.roundedRect(centerX - boxW / 2, y - 2, boxW, qrSize + 14, 2, 2, "FD");

  try {
    doc.addImage(qrImageData, "PNG", centerX - qrSize / 2, y + 1, qrSize, qrSize);
  } catch {
    return y;
  }

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.mutedText);
  doc.text(label, centerX, y + qrSize + 6, { align: "center" });

  return y + qrSize + 14;
}

// ─── Terms Block (premium) ────────────────────────────────────
export function addTermsBlock(
  doc: jsPDF,
  y: number,
  title: string,
  content: string
): number {
  const maxWidth = contentWidth(doc) - 8;
  y = ensureSpace(doc, y, 20);

  // Section header
  y = addSection(doc, title, y);

  // Terms card
  const pw = getPageWidth(doc);
  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.15);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);

  const lines = doc.splitTextToSize(content, maxWidth);
  const lineH = 2.8;
  const ph = getPageHeight(doc);
  const footerMargin = 22;

  let currentLine = 0;
  while (currentLine < lines.length) {
    const available = Math.floor((ph - y - footerMargin) / lineH);
    if (available < 3) {
      doc.addPage();
      y = 18;
      continue;
    }
    const chunk = lines.slice(currentLine, currentLine + available);
    const blockH = chunk.length * lineH + 4;

    doc.setFillColor(252, 252, 253);
    doc.setDrawColor(...THEME.divider);
    doc.roundedRect(MARGIN, y - 2, contentWidth(doc), blockH, 1, 1, "FD");
    doc.setTextColor(...THEME.mutedText);
    doc.text(chunk, MARGIN + 4, y + 2);

    currentLine += chunk.length;
    if (currentLine < lines.length) {
      doc.addPage();
      y = 18;
    } else {
      y += blockH + 2;
    }
  }

  return y;
}

// ─── Descriptive text block ───────────────────────────────────
export function addTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 8.5
): number {
  y = ensureSpace(doc, y, 12);
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize * 0.42) + 3;
}

export { autoTable };
