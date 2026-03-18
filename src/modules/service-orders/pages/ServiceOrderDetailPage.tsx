import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useServiceOrder, useDeleteServiceOrder, useActiveTerms, useOrderSignatures } from "../hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors, channelLabels, statusTransitions } from "../types";
import StatusTimeline from "../components/StatusTimeline";
import StatusChangeDialog from "../components/StatusChangeDialog";
import SignatureCapture from "../components/SignatureCapture";
import AttachmentUpload from "../components/AttachmentUpload";
import IntakeReceipt from "../components/IntakeReceipt";
import DeviceIntakeLabel from "../components/DeviceIntakeLabel";
import WhatsAppIntakeMessage from "../components/WhatsAppIntakeMessage";
import DiagnosticQuotePanel from "@/modules/diagnostics/components/DiagnosticQuotePanel";
import RepairTestWarrantyPanel from "@/modules/repair/components/RepairTestWarrantyPanel";
import DeviceLocationPanel from "../components/DeviceLocationPanel";
import PublicLinkManager from "@/modules/tracking/components/PublicLinkManager";
import CustomerCommunicationPanel from "../components/CustomerCommunicationPanel";
import WhatsAppSendButton from "@/modules/messaging/components/WhatsAppSendButton";
import MessageHistoryPanel from "@/modules/messaging/components/MessageHistoryPanel";
import { useServiceOrderPublicLinks, useGeneratePublicLink } from "@/modules/tracking/hooks/usePublicTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, Printer, RefreshCw, Calendar, User, MonitorSmartphone, Tag, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateServiceOrderPdf } from "@/lib/pdf-generators/service-order-pdf";
import { useCompanySettings, settingIsTrue, type CompanySettings } from "@/hooks/useCompanySettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/** Build PDF terms: prefer settings terms, fallback to DB terms */
function buildPdfTerms(settings: CompanySettings, dbTerms: any[] | undefined) {
  const result: { title: string; content: string }[] = [];
  if (settings.terms_service) result.push({ title: "Termos de Serviço", content: settings.terms_service });
  if (settings.terms_warranty) result.push({ title: "Condições de Garantia", content: settings.terms_warranty });
  if (settings.terms_abandonment) result.push({ title: "Política de Abandono", content: settings.terms_abandonment });
  // If no settings terms, fallback to DB terms
  if (result.length === 0 && dbTerms && dbTerms.length > 0) {
    return dbTerms.map((t: any) => ({ title: t.title, content: t.content }));
  }
  return result;
}

function printElement(el: HTMLElement | null, title: string, isLabel = false) {
  if (!el) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const labelStyles = isLabel
    ? `@page{size:80mm 50mm;margin:0}body{width:80mm;height:50mm;margin:0;overflow:hidden}`
    : ``;

  printWindow.document.write(`
    <html><head><title>${title}</title>
    <style>body{margin:0;font-family:Arial,sans-serif}@media print{body{-webkit-print-color-adjust:exact}${labelStyles}}</style>
    </head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Generate QR code as data URL for PDF
function generateQrDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;

      // We'll use qrcode.react's rendering via a temporary element
      // For simplicity, create a simple SVG-to-canvas approach
      // Actually, let's just render it from the existing QRCodeSVG in the DOM
      const qrEl = document.querySelector("[data-qr-pdf]");
      if (qrEl) {
        const svgData = new XMLSerializer().serializeToString(qrEl);
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 200, 200);
            ctx.drawImage(img, 0, 0, 200, 200);
            resolve(canvas.toDataURL("image/png"));
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      } else {
        resolve(null);
      }
    } catch {
      resolve(null);
    }
  });
}

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useServiceOrder(id);
  const deleteMutation = useDeleteServiceOrder();
  const [statusOpen, setStatusOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const companySettings = useCompanySettings();
  const generateLink = useGeneratePublicLink();

  // Fetch additional data for PDF
  const { data: statusHistory } = useQuery({
    queryKey: ["so-status-history-pdf", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_status_history")
        .select("*")
        .eq("service_order_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: diagnostic } = useQuery({
    queryKey: ["diagnostic-pdf", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnostics")
        .select("*")
        .eq("service_order_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: repairQuote } = useQuery({
    queryKey: ["repair-quote-pdf", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_quotes")
        .select("*")
        .eq("service_order_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: quoteItems } = useQuery({
    queryKey: ["repair-quote-items-pdf", repairQuote?.id],
    enabled: !!repairQuote?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_quote_items")
        .select("*")
        .eq("quote_id", repairQuote.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: signatures } = useOrderSignatures(id);
  const { data: terms } = useActiveTerms();
  const { data: publicLinks } = useServiceOrderPublicLinks(id);
  const activeLink = publicLinks?.find((l: any) => l.status === "active");
  const trackingUrl = activeLink
    ? `${window.location.origin}/track/${activeLink.public_token}`
    : null;

  const handleExportPdf = async () => {
    if (!order) return;

    const company = {
      name: companySettings.company_name,
      legalName: companySettings.company_legal_name,
      cnpj: companySettings.company_cnpj,
      address: companySettings.company_address,
      phone: companySettings.company_phone,
      email: companySettings.company_email,
      logoUrl: companySettings.company_logo_url,
    };

    // Try to get QR code image
    let qrCodeImageData: string | null = null;
    if (trackingUrl) {
      qrCodeImageData = await generateQrDataUrl(trackingUrl);
    }

    generateServiceOrderPdf({
      order,
      statusHistory: statusHistory || [],
      company,
      diagnostic: diagnostic || null,
      quoteData: repairQuote ? {
        quote_number: repairQuote.quote_number,
        total_amount: repairQuote.total_amount,
        discount_amount: repairQuote.discount_amount,
        analysis_fee: repairQuote.analysis_fee,
        labor_cost: (quoteItems || []).filter((i: any) => i.item_type === "labor").reduce((s: number, i: any) => s + Number(i.total_price), 0),
        parts_cost: (quoteItems || []).filter((i: any) => i.item_type === "part").reduce((s: number, i: any) => s + Number(i.total_price), 0),
        notes: repairQuote.notes,
      } : null,
      quoteItems: (quoteItems || []).map((i: any) => ({
        description: i.description,
        item_type: i.item_type,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price),
      })),
      signatures: (signatures || []).map((s) => ({
        signer_name: s.signer_name,
        signer_role: s.signer_role,
        signature_data: s.signature_data,
      })),
      terms: buildPdfTerms(companySettings, terms),
      qrCodeImageData,
      trackingUrl,
      displayOptions: {
        showQrCode: settingIsTrue(companySettings.pdf_show_qrcode),
        showSignatures: settingIsTrue(companySettings.pdf_show_signatures),
        showTerms: settingIsTrue(companySettings.pdf_show_terms),
        mode: (companySettings.pdf_mode as "compact" | "full") || "compact",
      },
    });
  };

  const handlePrintLabel = async () => {
    if (!order || !id) return;
    if (!trackingUrl) {
      await generateLink.mutateAsync(id);
      setTimeout(() => printElement(labelRef.current, `Etiqueta ${order.order_number}`, true), 1500);
    } else {
      printElement(labelRef.current, `Etiqueta ${order.order_number}`, true);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate("/service-orders");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!order) return <p className="text-center py-12 text-muted-foreground">OS não encontrada.</p>;

  const canChangeStatus = (statusTransitions[order.status] || []).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
            <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
            <Badge className={priorityColors[order.priority]}>{priorityLabels[order.priority]}</Badge>
          </div>
          <p className="text-muted-foreground">
            Criado em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {" · "}{channelLabels[order.intake_channel]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canChangeStatus && (
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Alterar Status
            </Button>
          )}
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={() => printElement(receiptRef.current, order.order_number)}>
            <Printer className="mr-2 h-4 w-4" /> Recibo
          </Button>
          <Button variant="outline" onClick={handlePrintLabel} disabled={generateLink.isPending}>
            <Tag className="mr-2 h-4 w-4" /> {generateLink.isPending ? "Gerando link..." : "Etiqueta"}
          </Button>
          {(order.status === "ready_for_pickup" || order.status === "delivered") && (
            <WhatsAppSendButton
              customerId={order.customer_id}
              customerPhone={order.customer_phone}
              customerName={order.customer_name || "Cliente"}
              eventType="os_ready"
              referenceType="service_order"
              referenceId={order.id}
              templateKey="os_ready_whatsapp"
              variables={{
                order_number: order.order_number,
                status: order.status === "ready_for_pickup" ? "Pronto para retirada" : "Concluído",
                final_notes: order.internal_notes || "",
              }}
              label="WhatsApp"
            />
          )}
          <Button variant="outline" asChild>
            <Link to={`/service-orders/${order.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Editar</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir OS?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Device */}
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <Link to={`/customers/${order.customer_id}`} className="font-medium hover:underline">
                    {order.customer_name}
                  </Link>
                </div>
              </div>
              {order.device_id && (
                <div className="flex items-start gap-3">
                  <MonitorSmartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dispositivo</p>
                    <Link to={`/devices/${order.device_id}`} className="font-medium hover:underline">
                      {order.device_label || "Ver dispositivo"}
                    </Link>
                  </div>
                </div>
              )}
              {order.expected_deadline && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo Estimado</p>
                    <p className="font-medium">{format(new Date(order.expected_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {order.reported_issue && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Problema Relatado</p>
                  <p className="text-sm">{order.reported_issue}</p>
                </div>
              )}
              {order.physical_condition && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Condição Física</p>
                  <div className="text-sm space-y-0.5">
                    {(() => {
                      try {
                        const items = typeof order.physical_condition === "string"
                          ? JSON.parse(order.physical_condition)
                          : order.physical_condition;
                        if (!Array.isArray(items)) return <p>{String(order.physical_condition)}</p>;
                        const labelMap: Record<string, string> = {
                          screen: "Tela/Display", body: "Carcaça/Estrutura", buttons: "Botões",
                          charging: "Carregamento", battery: "Bateria", speakers: "Alto-falantes",
                          camera: "Câmera", connectivity: "Rede/Wi-Fi", biometrics: "Biometria",
                        };
                        const statusMap: Record<string, string> = {
                          ok: "OK", damaged: "Danificado", not_working: "Não funciona", scratched: "Arranhado",
                          cracked: "Trincado", missing: "Ausente", not_tested: "Não testado",
                        };
                        return items.map((item: any) => (
                          <p key={item.id} className="flex items-center gap-1.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${item.status === "ok" ? "bg-green-500" : item.status === "damaged" ? "bg-red-500" : "bg-yellow-500"}`} />
                            <span className="font-medium">{labelMap[item.id] || item.id}:</span>
                            <span>{statusMap[item.status] || item.status}</span>
                            {item.notes && <span className="text-muted-foreground">({item.notes})</span>}
                          </p>
                        ));
                      } catch {
                        return <p>{String(order.physical_condition)}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}
              {order.accessories_received && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Acessórios Recebidos</p>
                  <p className="text-sm">{order.accessories_received}</p>
                </div>
              )}
              {order.intake_notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Observações de Entrada</p>
                  <p className="text-sm">{order.intake_notes}</p>
                </div>
              )}
              {order.internal_notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notas Internas</p>
                  <p className="text-sm bg-muted p-2 rounded">{order.internal_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnosis & Quote */}
          <DiagnosticQuotePanel serviceOrderId={order.id} deviceType={order.device_type} deviceBrand={order.device_brand} deviceModel={order.device_model} reportedIssue={order.reported_issue} />

          {/* Repair, Tests & Warranty */}
          <RepairTestWarrantyPanel serviceOrderId={order.id} orderStatus={order.status} />
          {/* Attachments */}
          <AttachmentUpload orderId={order.id} />

          {/* Signature */}
          <SignatureCapture orderId={order.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Histórico de Status</CardTitle></CardHeader>
            <CardContent>
              <StatusTimeline orderId={order.id} />
            </CardContent>
          </Card>

          <DeviceLocationPanel serviceOrderId={order.id} deviceId={order.device_id} />

          <PublicLinkManager serviceOrderId={order.id} orderNumber={order.order_number} />

          {/* WhatsApp intake message */}
          <WhatsAppIntakeMessage
            customerName={order.customer_name || "Cliente"}
            customerPhone={order.customer_phone}
            orderNumber={order.order_number}
            trackingUrl={trackingUrl}
          />

          {/* Customer Communication */}
          <CustomerCommunicationPanel
            serviceOrderId={order.id}
            customerPhone={order.customer_phone}
            customerName={order.customer_name || "Cliente"}
          />

          {/* WhatsApp Message History */}
          <MessageHistoryPanel referenceType="service_order" referenceId={order.id} />
        </div>
      </div>

      {/* Status change dialog */}
      <StatusChangeDialog orderId={order.id} currentStatus={order.status} open={statusOpen} onOpenChange={setStatusOpen} />

      {/* Hidden printable receipt */}
      <div className="hidden">
        <IntakeReceipt ref={receiptRef} order={order} trackingUrl={trackingUrl} />
      </div>

      {/* Hidden printable label */}
      <div className="hidden">
        <DeviceIntakeLabel
          ref={labelRef}
          orderNumber={order.order_number}
          deviceDescription={order.device_label || ""}
          reportedIssue={order.reported_issue}
          customerName={order.customer_name || ""}
          intakeDate={order.created_at}
          trackingUrl={trackingUrl}
          collectionPointName={order.collection_point_name}
        />
      </div>

      {/* Hidden QR code for PDF export */}
      {trackingUrl && (
        <div className="hidden">
          <svg data-qr-pdf style={{ display: "none" }} />
        </div>
      )}
    </div>
  );
}
