import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useServiceOrder, useDeleteServiceOrder } from "../hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors, channelLabels, statusTransitions } from "../types";
import StatusTimeline from "../components/StatusTimeline";
import StatusChangeDialog from "../components/StatusChangeDialog";
import SignatureCapture from "../components/SignatureCapture";
import AttachmentUpload from "../components/AttachmentUpload";
import IntakeReceipt from "../components/IntakeReceipt";
import DeviceIntakeLabel from "../components/DeviceIntakeLabel";
import DiagnosticQuotePanel from "@/modules/diagnostics/components/DiagnosticQuotePanel";
import RepairTestWarrantyPanel from "@/modules/repair/components/RepairTestWarrantyPanel";
import PublicLinkManager from "@/modules/tracking/components/PublicLinkManager";
import { useServiceOrderPublicLinks } from "@/modules/tracking/hooks/usePublicTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, Printer, RefreshCw, Calendar, User, MonitorSmartphone, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function printElement(el: HTMLElement | null, title: string) {
  if (!el) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html><head><title>${title}</title>
    <style>body{margin:0;font-family:Arial,sans-serif}@media print{body{-webkit-print-color-adjust:exact}}</style>
    </head><body>${el.innerHTML}</body></html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useServiceOrder(id);
  const deleteMutation = useDeleteServiceOrder();
  const [statusOpen, setStatusOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const { data: publicLinks } = useServiceOrderPublicLinks(id);
  const activeLink = publicLinks?.find((l: any) => l.status === "active");
  const trackingUrl = activeLink
    ? `${window.location.origin}/track/${activeLink.public_token}`
    : null;

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
          <Button variant="outline" onClick={() => printElement(receiptRef.current, order.order_number)}>
            <Printer className="mr-2 h-4 w-4" /> Recibo
          </Button>
          <Button variant="outline" onClick={() => printElement(labelRef.current, `Etiqueta ${order.order_number}`)}>
            <Tag className="mr-2 h-4 w-4" /> Etiqueta
          </Button>
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
                  <p className="text-sm">{order.physical_condition}</p>
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
          <DiagnosticQuotePanel serviceOrderId={order.id} />

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

          <PublicLinkManager serviceOrderId={order.id} orderNumber={order.order_number} />
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
        />
      </div>
    </div>
  );
}
