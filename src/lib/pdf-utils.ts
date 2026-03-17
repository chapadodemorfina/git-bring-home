import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PdfTheme {
  primary: [number, number, number];
  headerBg: [number, number, number];
  textColor: [number, number, number];
  mutedText: [number, number, number];
}

const DEFAULT_THEME: PdfTheme = {
  primary: [37, 99, 235],
  headerBg: [241, 245, 249],
  textColor: [15, 23, 42],
  mutedText: [100, 116, 139],
};

export function createPdf(orientation: "portrait" | "landscape" = "portrait") {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  return doc;
}

export function addHeader(doc: jsPDF, companyName: string, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const t = DEFAULT_THEME;

  // Company name
  doc.setFontSize(16);
  doc.setTextColor(...t.primary);
  doc.text(companyName || "i9 Solutions", 14, 18);

  // Title
  doc.setFontSize(12);
  doc.setTextColor(...t.textColor);
  doc.text(title, 14, 26);

  // Subtitle / date
  doc.setFontSize(9);
  doc.setTextColor(...t.mutedText);
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
  doc.text(subtitle || `Gerado em ${dateStr}`, 14, 32);

  // Right side date
  doc.text(dateStr, pageWidth - 14, 18, { align: "right" });

  // Divider
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 35, pageWidth - 14, 35);

  return 40; // y position after header
}

export function addSection(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11);
  doc.setTextColor(...DEFAULT_THEME.primary);
  doc.text(title, 14, y);
  doc.setTextColor(...DEFAULT_THEME.textColor);
  return y + 6;
}

export function addField(doc: jsPDF, label: string, value: string | null | undefined, x: number, y: number, maxWidth = 80): number {
  if (!value) return y;
  doc.setFontSize(8);
  doc.setTextColor(...DEFAULT_THEME.mutedText);
  doc.text(label, x, y);
  doc.setFontSize(9);
  doc.setTextColor(...DEFAULT_THEME.textColor);
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, x, y + 4);
  return y + 4 + lines.length * 4;
}

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
      fillColor: DEFAULT_THEME.headerBg,
      textColor: DEFAULT_THEME.textColor,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: DEFAULT_THEME.textColor,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    ...options,
  });

  return (doc as any).lastAutoTable?.finalY || startY + 20;
}

export function addFooter(doc: jsPDF, companyName?: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...DEFAULT_THEME.mutedText);
    doc.text(
      `${companyName || "i9 Solutions"} · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }
}

export function savePdf(doc: jsPDF, filename: string) {
  addFooter(doc);
  doc.save(`${filename}.pdf`);
}

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

export { autoTable };
