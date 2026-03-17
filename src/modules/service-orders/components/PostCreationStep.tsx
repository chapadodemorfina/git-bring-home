import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useServiceOrder } from "../hooks/useServiceOrders";
import { useServiceOrderPublicLinks } from "@/modules/tracking/hooks/usePublicTracking";
import { useCompanyName } from "@/hooks/useCompanyName";
import IntakePhotoUpload from "./IntakePhotoUpload";
import SignatureCapture from "./SignatureCapture";
import IntakeReceipt from "./IntakeReceipt";
import DeviceIntakeLabel from "./DeviceIntakeLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, Tag, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

interface Props {
  orderId: string;
}

export default function PostCreationStep({ orderId }: Props) {
  const navigate = useNavigate();
  const { data: order, isLoading } = useServiceOrder(orderId);
  const { data: publicLinks } = useServiceOrderPublicLinks(orderId);
  const companyName = useCompanyName("Assistência Técnica");
  const receiptRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const activeLink = publicLinks?.find((l: any) => l.status === "active");
  const trackingUrl = activeLink
    ? `${window.location.origin}/track/${activeLink.public_token}`
    : null;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-primary">✓ OS criada com sucesso!</h2>
        <p className="text-sm text-muted-foreground font-mono">{order.order_number}</p>
        <p className="text-sm text-muted-foreground">
          Registre fotos, condição do dispositivo e colete a assinatura do cliente.
        </p>
      </div>

      {/* Print Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Impressão
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => printElement(labelRef.current, `Etiqueta - ${order.order_number}`, true)}
          >
            <Tag className="mr-2 h-4 w-4" /> Imprimir Etiqueta
          </Button>
          <Button
            variant="outline"
            onClick={() => printElement(receiptRef.current, `Comprovante - ${order.order_number}`)}
          >
            <FileText className="mr-2 h-4 w-4" /> Imprimir Comprovante
          </Button>
        </CardContent>
      </Card>

      <IntakePhotoUpload orderId={orderId} />
      <SignatureCapture orderId={orderId} />

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate("/service-orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Lista de OS
        </Button>
        <Button onClick={() => navigate(`/service-orders/${orderId}`)}>
          Ver Detalhes da OS
        </Button>
      </div>

      {/* Hidden printable elements */}
      <div className="hidden">
        <IntakeReceipt ref={receiptRef} order={order} trackingUrl={trackingUrl} />
        <DeviceIntakeLabel
          ref={labelRef}
          orderNumber={order.order_number}
          deviceDescription={order.device_label || "Dispositivo"}
          reportedIssue={order.reported_issue}
          customerName={order.customer_name || "—"}
          intakeDate={order.created_at}
          trackingUrl={trackingUrl}
          collectionPointName={order.collection_point_name}
          companyName={companyName}
        />
      </div>
    </div>
  );
}
