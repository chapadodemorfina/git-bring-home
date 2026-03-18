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
  primary: [30, 64, 175],
  primaryLight: [219, 234, 254],
  primaryDark: [23, 37, 84],
  headerBg: [245, 247, 250],
  textColor: [15, 23, 42],
  mutedText: [100, 116, 139],
  accent: [99, 102, 241],
  success: [21, 128, 61],
  successLight: [220, 252, 231],
  danger: [185, 28, 28],
  dangerLight: [254, 226, 226],
  warning: [161, 98, 7],
  warningLight: [254, 249, 195],
  cardBg: [249, 250, 251],
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
function pw(doc: jsPDF) { return doc.internal.pageSize.getWidth(); }
function ph(doc: jsPDF) { return doc.internal.pageSize.getHeight(); }
const M = 14; // margin
function cw(doc: jsPDF) { return pw(doc) - M * 2; }

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > ph(doc) - 22) { doc.addPage(); return 18; }
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
  const pageW = pw(doc);
  const t = THEME;

  const info: CompanyInfo = typeof company === "string"
    ? { name: company, cnpj: "", address: "", phone: "", email: "", logoUrl: "" }
    : company;

  const companyName = info.name || "Assistência Técnica";

  // ── Top accent bar ──
  doc.setFillColor(...t.primaryDark);
  doc.rect(0, 0, pageW, 2, "F");

  // ── Company name (prominent) ──
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.primaryDark);
  doc.text(companyName, M, 13);

  // ── Company meta (single formatted line) ──
  const meta: string[] = [];
  if (info.cnpj) meta.push(`CNPJ ${info.cnpj}`);
  if (info.phone) meta.push(info.phone);
  if (info.email) meta.push(info.email);

  let metaY = 17.5;
  if (meta.length > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(meta.join("  ·  "), M, metaY);
    metaY += 3.5;
  }
  if (info.address) {
    doc.setFontSize(7);
    doc.setTextColor(...t.mutedText);
    doc.text(info.address, M, metaY);
    metaY += 3.5;
  }

  // ── Right: generation date ──
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.setFontSize(6.5);
  doc.setTextColor(...t.mutedText);
  doc.text(`Emitido em ${dateStr}`, pageW - M, 13, { align: "right" });

  // ── Title row ──
  const titleY = Math.max(metaY + 2, 24);
  // Title text (left, dark)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.primaryDark);
  doc.text(title, M, titleY + 1);

  // Status badge (right, pill shape)
  if (subtitle) {
    const badgeText = subtitle;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(badgeText);
    const badgeW = tw + 8;
    const badgeX = pageW - M - badgeW;
    const badgeY = titleY - 3;
    doc.setFillColor(...t.primary);
    doc.roundedRect(badgeX, badgeY, badgeW, 7, 3, 3, "F");
    doc.setTextColor(...t.white);
    doc.text(badgeText, badgeX + badgeW / 2, badgeY + 5, { align: "center" });
  }

  // Divider
  const divY = titleY + 4;
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.5);
  doc.line(M, divY, pageW - M, divY);

  return divY + 4;
}

// ─── Section Title ───────────────────────────────────────────
export function addSection(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 12);

  // Left accent pip + text (no full-width bar)
  doc.setFillColor(...THEME.primary);
  doc.roundedRect(M, y - 2, 1.5, 6, 0.5, 0.5, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(title.toUpperCase(), M + 4, y + 2);

  // Subtle line
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.15);
  doc.line(M + 4, y + 4, pw(doc) - M, y + 4);

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
  doc.setFontSize(6);
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

// ─── Highlighted Field (IMEI, serial) ─────────────────────────
export function addHighlightedField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width = 80
): number {
  doc.setFillColor(...THEME.primaryLight);
  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y - 2, width, 11, 1.5, 1.5, "FD");

  doc.setFontSize(5.5);
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

// ─── Text Card (for descriptions, notes, accessories) ─────────
export function addTextCard(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 8.5
): number {
  y = ensureSpace(doc, y, 14);
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  const lines = doc.splitTextToSize(text, maxWidth - 8);
  const blockH = lines.length * (fontSize * 0.42) + 6;

  // Card background
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.15);
  doc.roundedRect(x, y - 1, maxWidth, blockH, 1.5, 1.5, "FD");

  doc.text(lines, x + 4, y + 3);
  return y + blockH + 1;
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
  doc.roundedRect(M, y, cw(doc), height, 2, 2, "FD");
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
    margin: { left: M, right: M },
    headStyles: {
      fillColor: THEME.primaryDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: THEME.textColor,
      cellPadding: 1.8,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: {
      lineWidth: 0.1,
      lineColor: THEME.divider,
      overflow: "linebreak",
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
  const pageW = pw(doc);
  const boxWidth = 82;
  const boxX = pageW - M - boxWidth;
  const lineH = 5;
  const boxHeight = lines.length * lineH + 7;

  y = ensureSpace(doc, y, boxHeight + 2);

  // Subtle shadow
  doc.setFillColor(235, 235, 235);
  doc.roundedRect(boxX + 0.4, y + 0.4, boxWidth, boxHeight, 1.5, 1.5, "F");

  doc.setFillColor(...THEME.white);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 1.5, 1.5, "FD");

  let ly = y + 5;
  lines.forEach((line, i) => {
    const isTotal = i === lines.length - 1 && line.bold;
    if (isTotal) {
      doc.setFillColor(...THEME.primaryLight);
      doc.rect(boxX + 1, ly - 3, boxWidth - 2, lineH, "F");
    }
    doc.setFontSize(line.bold ? 9.5 : 7.5);
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setTextColor(...(line.color || THEME.textColor));
    doc.text(line.label, boxX + 4, ly);
    doc.text(line.value, boxX + boxWidth - 4, ly, { align: "right" });
    ly += lineH;
  });

  return y + boxHeight + 2;
}

// ─── Footer ──────────────────────────────────────────────────
export function addFooter(doc: jsPDF, company?: CompanyInfo | string) {
  const pageCount = doc.getNumberOfPages();
  const pageW = pw(doc);
  const pageH = ph(doc);

  const companyName = typeof company === "string"
    ? company
    : (company?.name || "");

  const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.3);
    doc.line(M, pageH - 16, pageW - M, pageH - 16);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.mutedText);

    if (companyName) {
      doc.setFont("helvetica", "bold");
      doc.text(companyName, M, pageH - 12);
      doc.setFont("helvetica", "normal");
    }

    doc.text(`Gerado em ${dateStr}`, pageW / 2, pageH - 12, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, pageW - M, pageH - 12, { align: "right" });

    // Developer credit
    doc.setFontSize(5);
    doc.setTextColor(170, 178, 190);
    doc.text(DEVELOPER_CREDIT, pageW / 2, pageH - 8, { align: "center" });
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
        1: { cellWidth: 20, halign: "center" as const },
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

// ─── Signature Block (compact) ────────────────────────────────
export function addSignatureBlock(
  doc: jsPDF,
  y: number,
  signatures: { name: string; role: string; imageData?: string }[]
): number {
  y = ensureSpace(doc, y, 28);

  const sigCount = Math.max(signatures.length, 2);
  const gap = 8;
  const slotWidth = (cw(doc) - (sigCount - 1) * gap) / sigCount;
  const cardH = 22;

  signatures.forEach((sig, i) => {
    const x = M + i * (slotWidth + gap);
    const centerX = x + slotWidth / 2;

    // Card
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, y, slotWidth, cardH, 1.5, 1.5, "FD");

    // Signature image
    if (sig.imageData) {
      try {
        const imgW = Math.min(slotWidth - 14, 48);
        doc.addImage(sig.imageData, "PNG", centerX - imgW / 2, y + 1, imgW, 10);
      } catch { /* skip */ }
    }

    // Line
    doc.setDrawColor(...THEME.mutedText);
    doc.setLineWidth(0.2);
    doc.line(x + 8, y + 13, x + slotWidth - 8, y + 13);

    // Name
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...THEME.textColor);
    doc.text(sig.name || "________________________________", centerX, y + 17, { align: "center" });

    // Role
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.primary);
    doc.text(sig.role, centerX, y + 20.5, { align: "center" });
  });

  return y + cardH + 2;
}

// ─── Watermark ────────────────────────────────────────────────
export function addWatermark(doc: jsPDF, text: string) {
  const pageCount = doc.getNumberOfPages();
  const pageW = pw(doc);
  const pageH = ph(doc);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "bold");
    doc.text(text, pageW / 2, pageH / 2, { align: "center", angle: 45 });
    doc.restoreGraphicsState();
  }
}

// ─── QR Code Block (compact) ──────────────────────────────────
export function addQrCodeBlock(
  doc: jsPDF,
  y: number,
  qrImageData: string | null,
  label: string
): number {
  if (!qrImageData) return y;

  const pageW = pw(doc);
  y = ensureSpace(doc, y, 46);

  const centerX = pageW / 2;
  const qrSize = 32;
  const boxW = 65;
  const boxH = qrSize + 14;

  // Container
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.15);
  doc.roundedRect(centerX - boxW / 2, y, boxW, boxH, 2, 2, "FD");

  try {
    doc.addImage(qrImageData, "PNG", centerX - qrSize / 2, y + 2, qrSize, qrSize);
  } catch {
    return y;
  }

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(label, centerX, y + qrSize + 5, { align: "center" });

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);
  doc.text("Escaneie para acompanhar o status do reparo", centerX, y + qrSize + 9, { align: "center" });

  return y + boxH + 2;
}

// ─── Page 2 Mini Header ──────────────────────────────────────
export function addContinuationHeader(
  doc: jsPDF,
  orderNumber: string,
  customerName: string,
  sectionTitle = "Validação e Assinaturas"
): number {
  const pageW = pw(doc);
  let y = 14;

  // Light top bar
  doc.setFillColor(...THEME.primaryDark);
  doc.rect(0, 0, pageW, 2, "F");

  // OS reference
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(`OS: ${orderNumber}`, M, y);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);
  doc.text(customerName, pageW - M, y, { align: "right" });

  y += 4;

  // Section title centered
  doc.setFillColor(...THEME.primary);
  const titleW = 70;
  doc.roundedRect(pageW / 2 - titleW / 2, y, titleW, 8, 3, 3, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.white);
  doc.text(sectionTitle, pageW / 2, y + 5.5, { align: "center" });

  return y + 14;
}

// ─── Terms Block ──────────────────────────────────────────────
export function addTermsBlock(
  doc: jsPDF,
  y: number,
  title: string,
  content: string
): number {
  const maxW = cw(doc) - 6;
  y = ensureSpace(doc, y, 18);

  y = addSection(doc, title, y);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);

  const lines = doc.splitTextToSize(content, maxW);
  const lineH = 2.8;
  const pageH = ph(doc);
  const footerMargin = 22;

  let currentLine = 0;
  while (currentLine < lines.length) {
    const available = Math.floor((pageH - y - footerMargin) / lineH);
    if (available < 3) { doc.addPage(); y = 18; continue; }
    const chunk = lines.slice(currentLine, currentLine + available);
    const blockH = chunk.length * lineH + 4;

    // Terms card
    doc.setFillColor(252, 252, 253);
    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.1);
    doc.roundedRect(M, y - 1, cw(doc), blockH, 1, 1, "FD");

    doc.setTextColor(...THEME.mutedText);
    doc.text(chunk, M + 3, y + 2);

    currentLine += chunk.length;
    if (currentLine < lines.length) { doc.addPage(); y = 18; }
    else { y += blockH + 1; }
  }

  return y;
}

// ─── Legacy text block alias ──────────────────────────────────
export function addTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 8.5
): number {
  return addTextCard(doc, text, x, y, maxWidth, fontSize);
}

export { autoTable };
