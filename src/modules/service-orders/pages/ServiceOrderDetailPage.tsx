import { useRef, useState, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useServiceOrder, useDeleteServiceOrder, useActiveTerms, useOrderSignatures } from "../hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors, channelLabels, statusTransitions } from "../types";
import StatusTimeline from "../components/StatusTimeline";
import StatusChangeDialog from "../components/StatusChangeDialog";
import IntakeReceipt from "../components/IntakeReceipt";
import DeviceIntakeLabel from "../components/DeviceIntakeLabel";
import WhatsAppIntakeMessage from "../components/WhatsAppIntakeMessage";
import PublicLinkManager from "@/modules/tracking/components/PublicLinkManager";
import CustomerCommunicationPanel from "../components/CustomerCommunicationPanel";
import WhatsAppSendButton from "@/modules/messaging/components/WhatsAppSendButton";
import MessageHistoryPanel from "@/modules/messaging/components/MessageHistoryPanel";
import IntakeTab from "../components/tabs/IntakeTab";
import DiagnosisQuoteTab from "../components/tabs/DiagnosisQuoteTab";
import RepairTestWarrantyPanel from "@/modules/repair/components/RepairTestWarrantyPanel";
import AttachmentUpload from "../components/AttachmentUpload";
import CommercialTab from "../components/tabs/CommercialTab";
import LogisticsPartnerTab from "../components/tabs/LogisticsPartnerTab";
import { useServiceOrderPublicLinks, useGeneratePublicLink } from "@/modules/tracking/hooks/usePublicTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, Printer, RefreshCw, Tag, FileDown, ClipboardList, Stethoscope, Wrench, DollarSign, Truck, ShoppingCart, MoreHorizontal, MessageCircle, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ServiceOrderStepper from "../components/ServiceOrderStepper";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateServiceOrderPdf } from "@/lib/pdf-generators/service-order-pdf";
import { generatePaymentReceiptPdf } from "@/lib/pdf-generators/service-order-payment-receipt-pdf";
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

function generateQrDataUrl(_url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.querySelector("[data-qr-pdf] canvas") as HTMLCanvasElement | null;
      if (canvas) {
        resolve(canvas.toDataURL("image/png"));
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

  // Financial data for payment receipt
  const { data: financialEntries } = useQuery({
    queryKey: ["so-financial-entries", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("*")
        .eq("service_order_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: financialPayments } = useQuery({
    queryKey: ["so-financial-payments", id],
    enabled: !!id && (financialEntries || []).length > 0,
    queryFn: async () => {
      const entryIds = (financialEntries || []).map((e: any) => e.id);
      if (entryIds.length === 0) return [];
      const { data, error } = await db
        .from("financial_payments")
        .select("*")
        .in("financial_entry_id", entryIds)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

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
    let qrCodeImageData: string | null = null;
    if (trackingUrl) {
      qrCodeImageData = await generateQrDataUrl(trackingUrl);
    }
    await generateServiceOrderPdf({
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
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl sm:text-2xl font-bold font-mono">{order.order_number}</h1>
              <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
              <Badge className={priorityColors[order.priority]}>{priorityLabels[order.priority]}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Criado em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {" · "}{channelLabels[order.intake_channel]}
              {order.collection_point_name && ` · ${order.collection_point_name}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {canChangeStatus && (
              <Button onClick={() => setStatusOpen(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Avançar Status
              </Button>
            )}

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printElement(receiptRef.current, order.order_number)}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintLabel} disabled={generateLink.isPending}>
                  <Tag className="mr-2 h-4 w-4" /> {generateLink.isPending ? "Gerando..." : "Imprimir Etiqueta"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/service-orders/${order.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Editar OS
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
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

        {/* Progress Stepper */}
        <Card className="p-3 sm:p-4">
          <ServiceOrderStepper currentStatus={order.status} />
        </Card>
      </div>

      {/* Main content: tabs + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
                <ClipboardList className="h-3.5 w-3.5" /> Resumo
              </TabsTrigger>
              <TabsTrigger value="technical" className="gap-1.5 text-xs sm:text-sm">
                <Stethoscope className="h-3.5 w-3.5" /> Técnico
              </TabsTrigger>
              <TabsTrigger value="commercial" className="gap-1.5 text-xs sm:text-sm">
                <ShoppingCart className="h-3.5 w-3.5" /> Comercial
              </TabsTrigger>
              {order.collection_point_id && (
                <TabsTrigger value="logistics" className="gap-1.5 text-xs sm:text-sm">
                  <Truck className="h-3.5 w-3.5" /> Logística
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="summary">
              <IntakeTab order={order} />
            </TabsContent>

            <TabsContent value="technical">
              <div className="space-y-6">
                <DiagnosisQuoteTab
                  serviceOrderId={order.id}
                  deviceType={order.device_type}
                  deviceBrand={order.device_brand}
                  deviceModel={order.device_model}
                  reportedIssue={order.reported_issue}
                />
                <RepairTestWarrantyPanel serviceOrderId={order.id} orderStatus={order.status} />
                <AttachmentUpload orderId={order.id} />
              </div>
            </TabsContent>

            <TabsContent value="commercial">
              <CommercialTab
                serviceOrderId={order.id}
                totalAmount={Number(order.total_amount || 0)}
                orderStatus={order.status}
              />
            </TabsContent>

            {order.collection_point_id && (
              <TabsContent value="logistics">
                <LogisticsPartnerTab
                  serviceOrderId={order.id}
                  deviceId={order.device_id}
                  collectionPointId={order.collection_point_id}
                  collectionPointName={order.collection_point_name || null}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Histórico de Status</CardTitle></CardHeader>
            <CardContent>
              <StatusTimeline orderId={order.id} />
            </CardContent>
          </Card>

          <PublicLinkManager serviceOrderId={order.id} orderNumber={order.order_number} />

          <WhatsAppIntakeMessage
            customerName={order.customer_name || "Cliente"}
            customerPhone={order.customer_phone}
            orderNumber={order.order_number}
            trackingUrl={trackingUrl}
          />

          <CustomerCommunicationPanel
            serviceOrderId={order.id}
            customerPhone={order.customer_phone}
            customerName={order.customer_name || "Cliente"}
          />

          <MessageHistoryPanel referenceType="service_order" referenceId={order.id} />
        </div>
      </div>

      {/* Status change dialog */}
      <StatusChangeDialog orderId={order.id} currentStatus={order.status} open={statusOpen} onOpenChange={setStatusOpen} />

      {/* Hidden printable elements */}
      <div className="hidden">
        <IntakeReceipt ref={receiptRef} order={order} trackingUrl={trackingUrl} />
      </div>
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
      {trackingUrl && (
        <div data-qr-pdf style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <QRCodeCanvas value={trackingUrl} size={200} level="M" />
        </div>
      )}
    </div>
  );
}
