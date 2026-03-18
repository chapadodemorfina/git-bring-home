import {
  createPdf, addHeader, addSection, addField, addHighlightedField,
  addTable, addTotalBox, addChecklistTable, addSignatureBlock,
  addTermsBlock, savePdf, addTextCard,
  addContinuationHeader, fetchImageAsDataUrl, addCompactInitials,
  setBottomReserve,
  formatCurrency, formatDateTime,
  type CompanyInfo,
  DEFAULT_THEME,
} from "@/lib/pdf-utils";
import { statusLabels } from "@/modules/service-orders/types";

// ─── Interfaces ───────────────────────────────────────────────
interface ServiceOrderData {
  order_number: string;
  status: string;
  priority: string;
  intake_channel: string;
  created_at: string;
  updated_at?: string;
  expected_deadline?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  customer_document?: string | null;
  device_label?: string;
  device_serial?: string | null;
  device_imei?: string | null;
  device_color?: string | null;
  device_brand?: string | null;
  device_model?: string | null;
  reported_issue?: string | null;
  physical_condition?: string | null;
  accessories_received?: string | null;
  intake_notes?: string | null;
  internal_notes?: string | null;
  technician_name?: string;
  collection_point_name?: string | null;
}

interface StatusEntry { from_status: string | null; to_status: string; notes: string | null; created_at: string; }
interface DiagnosticData { technical_findings?: string | null; probable_cause?: string | null; repair_complexity?: string; repair_viability?: string | null; estimated_repair_hours?: number | null; estimated_cost?: number | null; not_repairable_reason?: string | null; }
interface QuoteItem { description: string; item_type: string; quantity: number; unit_price: number; total_price: number; }
interface QuoteData { quote_number?: string; total_amount?: number; discount_amount?: number; analysis_fee?: number; labor_cost?: number; parts_cost?: number; notes?: string | null; }
interface SignatureData { signer_name: string; signer_role: string; signature_data: string; }
interface TermData { title: string; content: string; }
interface ChecklistItem { label: string; checked: boolean; notes?: string; }

export interface PdfDisplayOptions {
  showQrCode?: boolean;
  showSignatures?: boolean;
  showTerms?: boolean;
  mode?: "compact" | "full";
}

export interface ServiceOrderPdfOptions {
  order: ServiceOrderData;
  statusHistory?: StatusEntry[];
  company: CompanyInfo;
  diagnostic?: DiagnosticData | null;
  quoteData?: QuoteData | null;
  quoteItems?: QuoteItem[];
  signatures?: SignatureData[];
  terms?: TermData[];
  entryChecklist?: ChecklistItem[];
  exitChecklist?: ChecklistItem[];
  qrCodeImageData?: string | null;
  trackingUrl?: string | null;
  displayOptions?: PdfDisplayOptions;
}

// ─── Maps ─────────────────────────────────────────────────────
const priorityMap: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
const channelMap: Record<string, string> = { front_desk: "Balcão", collection_point: "Ponto de Coleta", whatsapp: "WhatsApp", phone: "Telefone", email: "E-mail", website: "Website" };
const complexityMap: Record<string, string> = { simple: "Simples", moderate: "Moderada", complex: "Complexa", specialized: "Especializada" };
const viabilityMap: Record<string, string> = { repairable: "Reparável", not_repairable: "Não Reparável", uncertain: "Incerto" };

const CHECKLIST_NAME_MAP: Record<string, string> = {
  screen: "Tela/Display", body: "Carcaça/Estrutura", buttons: "Botões",
  charging: "Porta de Carga", battery: "Bateria", speakers: "Alto-falante/Mic",
  camera: "Câmera", connectivity: "Wi-Fi/Bluetooth", biometrics: "Biometria/Face ID",
};
const CHECKLIST_STATUS_MAP: Record<string, string> = { ok: "OK", damaged: "Danificado", scratched: "Arranhado", cracked: "Trincado", missing: "Ausente", na: "N/A" };

function parsePhysicalCondition(raw: string | null | undefined): ChecklistItem[] | null {
  if (!raw) return null;
  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      return items.map((item: any) => ({
        label: CHECKLIST_NAME_MAP[item.id] || CHECKLIST_NAME_MAP[item.name] || item.id || item.name || "",
        checked: item.status === "ok" || item.status === "na",
        notes: [CHECKLIST_STATUS_MAP[item.status] || item.status || "", item.notes || ""].filter(Boolean).join(" — "),
      }));
    }
  } catch { /* not JSON */ }
  return null;
}

// ─── Main Generator ───────────────────────────────────────────
export async function generateServiceOrderPdf(opts: ServiceOrderPdfOptions) {
  const { order, statusHistory, company, diagnostic, quoteData, quoteItems,
          signatures, terms, entryChecklist, exitChecklist, qrCodeImageData, displayOptions } = opts;

  const doc = createPdf();
  const col1 = 16;
  const col2 = 110;
  const CW = 165; // content width for text cards

  const showSigs = displayOptions?.showSignatures !== false;

  // Reserve extra bottom space for initials/signatures (18mm footer + 14mm initials area)
  const INITIALS_RESERVE = showSigs ? 32 : 18;
  setBottomReserve(INITIALS_RESERVE);

  // ── Fetch logo ──
  const logoDataUrl = company.logoUrl ? await fetchImageAsDataUrl(company.logoUrl) : null;

  // ── HEADER ──
  let y = addHeader(doc, company,
    `Ordem de Serviço: ${order.order_number}`,
    statusLabels[order.status as keyof typeof statusLabels] || order.status,
    logoDataUrl,
    qrCodeImageData || null
  );

  // ── 1. INFORMAÇÕES DA OS ──
  y = addSection(doc, "Informações da Ordem de Serviço", y);
  y = addField(doc, "Nº da OS", order.order_number, col1, y);
  addField(doc, "Prioridade", priorityMap[order.priority] || order.priority, col2, y - 6.5);
  y = addField(doc, "Data de Abertura", formatDateTime(order.created_at), col1, y);
  addField(doc, "Canal de Entrada", channelMap[order.intake_channel] || order.intake_channel, col2, y - 6.5);
  if (order.expected_deadline) y = addField(doc, "Prazo Estimado", formatDateTime(order.expected_deadline), col1, y);
  if (order.technician_name) addField(doc, "Técnico Responsável", order.technician_name, col2, y - 6.5);
  if (order.collection_point_name) y = addField(doc, "Ponto de Coleta", order.collection_point_name, col1, y);

  // ── 2. DADOS DO CLIENTE ──
  y = addSection(doc, "Dados do Cliente", y);
  // Bold customer name for emphasis
  if (order.customer_name) {
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("NOME", col1, y);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(order.customer_name, col1, y + 3);
    if (order.customer_document) addField(doc, "CPF/CNPJ", order.customer_document, col2, y);
    y = y + 3 + 3.5;
  }
  if (order.customer_phone) y = addField(doc, "Telefone", order.customer_phone, col1, y);

  // ── 3. DADOS DO APARELHO ──
  if (order.device_label || order.device_brand) {
    y = addSection(doc, "Dados do Aparelho", y);
    if (order.device_brand) {
      // Bold brand/model for emphasis
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("MARCA", col1, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(order.device_brand, col1, y + 3);
      if (order.device_model) {
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("MODELO", col2, y);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(order.device_model, col2, y + 3);
      }
      y = y + 3 + 3.5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
    }
    if (order.device_serial) {
      y = addField(doc, "Nº de Série", order.device_serial, col1, y);
      if (order.device_color) addField(doc, "Cor", order.device_color, col2, y - 6.5);
    }
    if (order.device_imei) {
      y = addHighlightedField(doc, "IMEI", order.device_imei, col1, y, 90);
    }
  }

  // ── 4. ESTADO FÍSICO ──
  const conditionItems = parsePhysicalCondition(order.physical_condition);
  if (conditionItems && conditionItems.length > 0) {
    y = addChecklistTable(doc, y, conditionItems, "Estado Físico do Aparelho");
  } else if (order.physical_condition) {
    y = addSection(doc, "Estado Físico do Aparelho", y);
    y = addTextCard(doc, order.physical_condition, col1, y, CW);
  }

  // ── Acessórios ──
  if (order.accessories_received) {
    y = addSection(doc, "Acessórios Entregues", y);
    y = addTextCard(doc, order.accessories_received, col1, y, CW);
  }

  // ── 5. DESCRIÇÃO DO PROBLEMA ──
  if (order.reported_issue) {
    y = addSection(doc, "Problema Relatado", y);
    y = addTextCard(doc, order.reported_issue, col1, y, CW);
  }

  // ── CHECKLIST DE ENTRADA ──
  if (entryChecklist && entryChecklist.length > 0) {
    y = addChecklistTable(doc, y, entryChecklist, "Checklist de Entrada");
  }

  // ── 6. DIAGNÓSTICO TÉCNICO ──
  if (diagnostic) {
    y = addSection(doc, "Diagnóstico Técnico", y);
    if (diagnostic.technical_findings) y = addTextCard(doc, `Achados: ${diagnostic.technical_findings}`, col1, y, CW);
    if (diagnostic.probable_cause) y = addTextCard(doc, `Causa provável: ${diagnostic.probable_cause}`, col1, y, CW);
    if (diagnostic.repair_complexity) y = addField(doc, "Complexidade", complexityMap[diagnostic.repair_complexity] || diagnostic.repair_complexity, col1, y);
    if (diagnostic.repair_viability) addField(doc, "Viabilidade", viabilityMap[diagnostic.repair_viability] || diagnostic.repair_viability, col2, y - 6.5);
    if (diagnostic.estimated_repair_hours) y = addField(doc, "Horas Estimadas", `${diagnostic.estimated_repair_hours}h`, col1, y);
    if (diagnostic.not_repairable_reason) y = addTextCard(doc, `Motivo inviabilidade: ${diagnostic.not_repairable_reason}`, col1, y, CW);
  }

  // ── 7. SERVIÇOS E PEÇAS ──
  if (quoteItems && quoteItems.length > 0) {
    y = addSection(doc, "Serviços e Peças", y);
    y = addTable(doc, y,
      ["Descrição", "Tipo", "Qtd", "Valor Un.", "Total"],
      quoteItems.map((item) => [
        item.description,
        item.item_type === "labor" ? "Mão de obra" : item.item_type === "part" ? "Peça" : "Serviço",
        String(item.quantity),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]),
      { columnStyles: { 0: { cellWidth: 65 }, 3: { halign: "right" as const }, 4: { halign: "right" as const } } }
    );
  }

  // ── 8. RESUMO FINANCEIRO ──
  if (quoteData && (quoteData.total_amount || 0) > 0) {
    const totalLines: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[] = [];
    if (quoteData.parts_cost) totalLines.push({ label: "Peças", value: formatCurrency(quoteData.parts_cost) });
    if (quoteData.labor_cost) totalLines.push({ label: "Mão de Obra", value: formatCurrency(quoteData.labor_cost) });
    if (quoteData.analysis_fee && quoteData.analysis_fee > 0) totalLines.push({ label: "Taxa de Análise", value: formatCurrency(quoteData.analysis_fee) });
    if (quoteData.discount_amount && quoteData.discount_amount > 0) totalLines.push({ label: "Desconto", value: `- ${formatCurrency(quoteData.discount_amount)}`, color: DEFAULT_THEME.danger });
    totalLines.push({ label: "TOTAL", value: formatCurrency(quoteData.total_amount), bold: true, color: DEFAULT_THEME.primary });
    y = addTotalBox(doc, y, totalLines);
  }

  // ── CHECKLIST DE SAÍDA ──
  if (exitChecklist && exitChecklist.length > 0) {
    y = addChecklistTable(doc, y, exitChecklist, "Checklist de Saída");
  }

  // ── OBSERVAÇÕES ──
  if (order.intake_notes) {
    y = addSection(doc, "Observações", y);
    y = addTextCard(doc, order.intake_notes, col1, y, CW);
  }

  // ── HISTÓRICO DE STATUS ──
  if (statusHistory && statusHistory.length > 0) {
    y = addSection(doc, "Histórico de Status", y);
    y = addTable(doc, y, ["Data/Hora", "De", "Para", "Observações"],
      statusHistory.map((h) => [
        formatDateTime(h.created_at),
        h.from_status ? (statusLabels[h.from_status as keyof typeof statusLabels] || h.from_status) : "—",
        statusLabels[h.to_status as keyof typeof statusLabels] || h.to_status,
        h.notes || "—",
      ])
    );
  }

  // ── TERMOS E GARANTIA ──
  const showTerms = displayOptions?.showTerms !== false;
  if (showTerms && terms && terms.length > 0) {
    terms.forEach((term) => { y = addTermsBlock(doc, y, term.title, term.content); });
  }

  // ── CLOSING BLOCK (QR + Signatures) ──
  const showQr = displayOptions?.showQrCode !== false && !!qrCodeImageData;
  const showSigs = displayOptions?.showSignatures !== false;
  const isCompact = displayOptions?.mode !== "full";

  const sigBlockH = showSigs ? 20 : 0;
  const qrBlockH = showQr ? 36 : 0;
  const closingH = qrBlockH + sigBlockH;
  const pageHeight = doc.internal.pageSize.getHeight();
  const remaining = pageHeight - y - 16;

  // In compact mode: skip QR if it would force a page break but signatures alone fit
  const skipQrToFitOnePage = isCompact && showQr && remaining < closingH && remaining >= sigBlockH;

  if (closingH > 0 && !skipQrToFitOnePage && remaining < closingH) {
    doc.addPage();
    y = addContinuationHeader(doc, order.order_number, order.customer_name || "—");
  }

  if (showQr && !skipQrToFitOnePage) {
    y = addQrCodeBlock(doc, y, qrCodeImageData, "Acompanhe seu reparo pelo QR Code");
  }

  // ── ASSINATURAS ──
  const sigList: { name: string; role: string; imageData?: string }[] = [];
  if (showSigs) {
    (signatures || []).forEach((s) => {
      sigList.push({
        name: s.signer_name,
        role: s.signer_role === "customer" ? "Cliente" : s.signer_role === "technician" ? "Técnico" : s.signer_role,
        imageData: s.signature_data,
      });
    });
    if (sigList.length === 0) {
      sigList.push({ name: "", role: "Cliente", imageData: undefined });
      sigList.push({ name: "", role: "Técnico", imageData: undefined });
    } else if (sigList.length === 1) {
      sigList.push({ name: "", role: sigList[0].role === "Cliente" ? "Técnico" : "Cliente", imageData: undefined });
    }
    y = addSignatureBlock(doc, y, sigList as any);
  }

  // ── ADD BLANK SIGNATURES TO ALL PREVIOUS PAGES (when multi-page) ──
  const totalPages = doc.getNumberOfPages();
  if (showSigs && totalPages > 1) {
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    const mLeft = 16;
    const contentW = pageW - mLeft * 2;
    const blankSigs = sigList.map(s => ({ name: "", role: s.role }));
    const sigCount = Math.max(blankSigs.length, 2);
    const gap = 6;
    const slotW = (contentW - (sigCount - 1) * gap) / sigCount;
    const cardH = 18;

    for (let p = 1; p < totalPages; p++) {
      doc.setPage(p);
      const sigY = pageH - 12 - cardH; // just above footer

      blankSigs.forEach((sig, i) => {
        const x = mLeft + i * (slotW + gap);
        const centerX = x + slotW / 2;

        // Card background
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.12);
        doc.roundedRect(x, sigY, slotW, cardH, 1.2, 1.2, "FD");

        // Signature line
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.15);
        doc.line(x + 6, sigY + 10.5, x + slotW - 6, sigY + 10.5);

        // Role label
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 64, 175);
        doc.text(sig.role, centerX, sigY + 17, { align: "center" });
      });
    }
    // Return to last page
    doc.setPage(totalPages);
  }

  // ── SAVE ──
  savePdf(doc, `OS_${order.order_number}`, company);
}
