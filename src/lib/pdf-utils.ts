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
  legalName?: string;
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

// Default bottom reserve: 18mm for footer. Can be overridden for signature reserves.
let _bottomReserve = 18;
export function setBottomReserve(value: number) { _bottomReserve = value; }
export function getBottomReserve() { return _bottomReserve; }

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > ph(doc) - _bottomReserve) { doc.addPage(); return 16; }
  return y;
}

// ─── Create PDF ───────────────────────────────────────────────
export function createPdf(orientation: "portrait" | "landscape" = "portrait") {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  return doc;
}

// ─── Premium Header ──────────────────────────────────────────
/** Convert an image URL to a base64 data URL for jsPDF embedding */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function addHeader(
  doc: jsPDF,
  company: CompanyInfo | string,
  title: string,
  subtitle?: string,
  logoDataUrl?: string | null,
  qrCodeImageData?: string | null
): number {
  const pageW = pw(doc);
  const t = THEME;

  const info: CompanyInfo = typeof company === "string"
    ? { name: company, legalName: "", cnpj: "", address: "", phone: "", email: "", logoUrl: "" }
    : company;

  const companyName = info.name || "Assistência Técnica";

  // ── Top accent bar ──
  doc.setFillColor(...t.primaryDark);
  doc.rect(0, 0, pageW, 2, "F");

  // ── Logo (if available) ──
  const logoSize = 14;
  let textStartX = M;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", M, 4, logoSize, logoSize);
      textStartX = M + logoSize + 3;
    } catch { /* skip logo on error */ }
  }

  // ── Company name (prominent) ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.primaryDark);
  doc.text(companyName, textStartX, 12);

  // ── Company meta (single formatted line) ──
  const meta: string[] = [];
  if (info.cnpj) meta.push(`CNPJ ${info.cnpj}`);
  if (info.phone) meta.push(info.phone);
  if (info.email) meta.push(info.email);

  let metaY = 16;

  // ── Legal name (if different from trade name) ──
  if (info.legalName && info.legalName !== info.name) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(info.legalName, textStartX, metaY);
    metaY += 3;
  }
  if (meta.length > 0) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...t.mutedText);
    doc.text(meta.join("  ·  "), textStartX, metaY);
    metaY += 3;
  }
  if (info.address) {
    doc.setFontSize(6.5);
    doc.setTextColor(...t.mutedText);
    doc.text(info.address, textStartX, metaY);
    metaY += 3;
  }

  // ── Right: QR Code + generation date ──
  const qrSize = 20;
  const rightEdge = pageW - M;

  if (qrCodeImageData) {
    try {
      doc.addImage(qrCodeImageData, "PNG", rightEdge - qrSize, 3, qrSize, qrSize);
    } catch { /* skip QR on error */ }
  }

  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.setFontSize(6);
  doc.setTextColor(...t.mutedText);
  const dateX = qrCodeImageData ? rightEdge - qrSize - 2 : rightEdge;
  doc.text(`Emitido em ${dateStr}`, dateX, 12, { align: "right" });

  // ── Title row ──
  const titleY = Math.max(metaY + 1, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...t.primaryDark);
  doc.text(title, M, titleY + 1);

  // Status badge (right, pill shape)
  if (subtitle) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(subtitle);
    const badgeW = tw + 7;
    const badgeX = pageW - M - badgeW;
    const badgeY = titleY - 2.5;
    doc.setFillColor(...t.primary);
    doc.roundedRect(badgeX, badgeY, badgeW, 6.5, 3, 3, "F");
    doc.setTextColor(...t.white);
    doc.text(subtitle, badgeX + badgeW / 2, badgeY + 4.5, { align: "center" });
  }

  // Divider
  const divY = titleY + 3.5;
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.4);
  doc.line(M, divY, pageW - M, divY);

  return divY + 3;
}

// ─── Section Title ───────────────────────────────────────────
export function addSection(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 10);

  // Left accent pip + text
  doc.setFillColor(...THEME.primary);
  doc.roundedRect(M, y - 1.5, 1.2, 5, 0.5, 0.5, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(title.toUpperCase(), M + 3.5, y + 2);

  // Subtle line
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.12);
  doc.line(M + 3.5, y + 3.5, pw(doc) - M, y + 3.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  return y + 6;
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
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.mutedText);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, x, y + 3);
  return y + 3 + lines.length * 3.5;
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
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y - 1.5, width, 10, 1.5, 1.5, "FD");

  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primary);
  doc.text(label.toUpperCase(), x + 3, y + 1);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(value, x + 3, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  return y + 10;
}

// ─── Text Card (for descriptions, notes, accessories) ─────────
export function addTextCard(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize = 8
): number {
  y = ensureSpace(doc, y, 12);
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.textColor);
  const lines = doc.splitTextToSize(text, maxWidth - 6);
  const blockH = lines.length * (fontSize * 0.4) + 5;

  // Card background
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.12);
  doc.roundedRect(x, y - 0.5, maxWidth, blockH, 1.2, 1.2, "FD");

  doc.text(lines, x + 3, y + 2.5);
  return y + blockH + 0.5;
}

// ─── Info Card Block ─────────────────────────────────────────
export function addCard(
  doc: jsPDF,
  y: number,
  height: number,
  drawContent: (innerY: number) => number
): number {
  y = ensureSpace(doc, y, height + 3);
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.15);
  doc.roundedRect(M, y, cw(doc), height, 2, 2, "FD");
  return drawContent(y + 2);
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
      fontSize: 6.5,
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: THEME.textColor,
      cellPadding: 1.5,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: {
      lineWidth: 0.1,
      lineColor: THEME.divider,
      overflow: "linebreak",
    },
    ...options,
  });

  return (doc as any).lastAutoTable?.finalY || startY + 18;
}

// ─── Total Box ────────────────────────────────────────────────
export function addTotalBox(
  doc: jsPDF,
  y: number,
  lines: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[]
): number {
  const pageW = pw(doc);
  const boxWidth = 80;
  const boxX = pageW - M - boxWidth;
  const lineH = 4.5;
  const boxHeight = lines.length * lineH + 6;

  y = ensureSpace(doc, y, boxHeight + 2);

  doc.setFillColor(235, 235, 235);
  doc.roundedRect(boxX + 0.3, y + 0.3, boxWidth, boxHeight, 1.5, 1.5, "F");

  doc.setFillColor(...THEME.white);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 1.5, 1.5, "FD");

  let ly = y + 4.5;
  lines.forEach((line, i) => {
    const isTotal = i === lines.length - 1 && line.bold;
    if (isTotal) {
      doc.setFillColor(...THEME.primaryLight);
      doc.rect(boxX + 1, ly - 2.5, boxWidth - 2, lineH, "F");
    }
    doc.setFontSize(line.bold ? 9 : 7);
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setTextColor(...(line.color || THEME.textColor));
    doc.text(line.label, boxX + 3, ly);
    doc.text(line.value, boxX + boxWidth - 3, ly, { align: "right" });
    ly += lineH;
  });

  return y + boxHeight + 1;
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
    doc.setLineWidth(0.25);
    doc.line(M, pageH - 14, pageW - M, pageH - 14);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 90, 105);

    if (companyName) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 70, 85);
      doc.text(companyName, M, pageH - 10.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 90, 105);
    }

    doc.text(`Gerado em ${dateStr}`, pageW / 2, pageH - 10.5, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, pageW - M, pageH - 10.5, { align: "right" });

    // Developer credit
    doc.setFontSize(5);
    doc.setTextColor(140, 150, 165);
    doc.text(DEVELOPER_CREDIT, pageW / 2, pageH - 7, { align: "center" });
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
  y = ensureSpace(doc, y, 20);

  const sigCount = Math.max(signatures.length, 2);
  const gap = 6;
  const slotWidth = (cw(doc) - (sigCount - 1) * gap) / sigCount;
  const cardH = 18;

  signatures.forEach((sig, i) => {
    const x = M + i * (slotWidth + gap);
    const centerX = x + slotWidth / 2;

    // Card
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.12);
    doc.roundedRect(x, y, slotWidth, cardH, 1.2, 1.2, "FD");

    // Signature image
    if (sig.imageData) {
      try {
        const imgW = Math.min(slotWidth - 12, 44);
        doc.addImage(sig.imageData, "PNG", centerX - imgW / 2, y + 1, imgW, 8);
      } catch { /* skip */ }
    }

    // Line
    doc.setDrawColor(...THEME.mutedText);
    doc.setLineWidth(0.15);
    doc.line(x + 6, y + 10.5, x + slotWidth - 6, y + 10.5);

    // Name
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...THEME.textColor);
    doc.text(sig.name || "________________________________", centerX, y + 14, { align: "center" });

    // Role
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.primary);
    doc.text(sig.role, centerX, y + 17, { align: "center" });
  });

  return y + cardH + 1;
}

// ─── Compact Initials (for intermediate pages) ───────────────
export function addCompactInitials(
  doc: jsPDF,
  pageNum: number,
  roles: string[] = ["Cliente", "Técnico"]
) {
  doc.setPage(pageNum);
  const pageW = pw(doc);
  const pageH = ph(doc);
  const initialsY = pageH - 28; // above footer area

  const totalW = roles.length * 32 + (roles.length - 1) * 8;
  let startX = pageW - M - totalW;

  roles.forEach((role, i) => {
    const x = startX + i * 40;
    // Dotted line
    doc.setDrawColor(...THEME.mutedText);
    doc.setLineWidth(0.1);
    doc.line(x, initialsY + 4, x + 28, initialsY + 4);
    // Role label
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...THEME.mutedText);
    doc.text(`Rubrica ${role}`, x + 14, initialsY + 7, { align: "center" });
  });
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
  y = ensureSpace(doc, y, 34);

  const centerX = pageW / 2;
  const qrSize = 24;
  const boxW = 55;
  const boxH = qrSize + 11;

  // Container
  doc.setFillColor(...THEME.cardBg);
  doc.setDrawColor(...THEME.divider);
  doc.setLineWidth(0.12);
  doc.roundedRect(centerX - boxW / 2, y, boxW, boxH, 1.5, 1.5, "FD");

  try {
    doc.addImage(qrImageData, "PNG", centerX - qrSize / 2, y + 1.5, qrSize, qrSize);
  } catch {
    return y;
  }

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(label, centerX, y + qrSize + 4, { align: "center" });

  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);
  doc.text("Escaneie para acompanhar o status do reparo", centerX, y + qrSize + 7.5, { align: "center" });

  return y + boxH + 1;
}

// ─── Page 2 Mini Header ──────────────────────────────────────
export function addContinuationHeader(
  doc: jsPDF,
  orderNumber: string,
  customerName: string,
  sectionTitle = "Validação e Assinaturas"
): number {
  const pageW = pw(doc);
  let y = 12;

  doc.setFillColor(...THEME.primaryDark);
  doc.rect(0, 0, pageW, 2, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.primaryDark);
  doc.text(`OS: ${orderNumber}`, M, y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.mutedText);
  doc.text(customerName, pageW - M, y, { align: "right" });

  y += 3;

  const titleW = 65;
  doc.setFillColor(...THEME.primary);
  doc.roundedRect(pageW / 2 - titleW / 2, y, titleW, 7, 3, 3, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.white);
  doc.text(sectionTitle, pageW / 2, y + 5, { align: "center" });

  return y + 12;
}

// ─── Terms Block ──────────────────────────────────────────────
export function addTermsBlock(
  doc: jsPDF,
  y: number,
  title: string,
  content: string
): number {
  const maxW = cw(doc) - 4;
  y = ensureSpace(doc, y, 14);

  y = addSection(doc, title, y);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 80, 95);

  const lines = doc.splitTextToSize(content, maxW);
  const lineH = 2.7;
  const pageH = ph(doc);
  const footerMargin = 18;

  let currentLine = 0;
  while (currentLine < lines.length) {
    const available = Math.floor((pageH - y - footerMargin) / lineH);
    if (available < 3) { doc.addPage(); y = 16; continue; }
    const chunk = lines.slice(currentLine, currentLine + available);
    const blockH = chunk.length * lineH + 3;

    // Terms card
    doc.setFillColor(252, 252, 253);
    doc.setDrawColor(...THEME.divider);
    doc.setLineWidth(0.08);
    doc.roundedRect(M, y - 0.5, cw(doc), blockH, 1, 1, "FD");

    doc.setTextColor(...THEME.mutedText);
    doc.text(chunk, M + 2.5, y + 1.5);

    currentLine += chunk.length;
    if (currentLine < lines.length) { doc.addPage(); y = 16; }
    else { y += blockH + 0.5; }
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
