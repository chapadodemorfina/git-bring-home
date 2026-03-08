import { useParams, Link } from "react-router-dom";
import { useServiceOrder } from "@/modules/service-orders/hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors, ServiceOrderStatus } from "@/modules/service-orders/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, MonitorSmartphone, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QuickStatusBar from "../components/QuickStatusBar";
import RepairPhotoUpload from "../components/RepairPhotoUpload";
import RepairTestWarrantyPanel from "@/modules/repair/components/RepairTestWarrantyPanel";
import DiagnosticQuotePanel from "@/modules/diagnostics/components/DiagnosticQuotePanel";

export default function TechOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useServiceOrder(id);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  if (!order) return <p className="text-center py-8 text-muted-foreground">OS não encontrada.</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link to="/tech">
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold font-mono">{order.order_number}</h1>
            <Badge className={`text-[10px] ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </Badge>
            <Badge className={`text-[10px] ${priorityColors[order.priority]}`}>
              {priorityLabels[order.priority]}
            </Badge>
          </div>
        </div>
        <Link to={`/service-orders/${order.id}`}>
          <Button size="icon" variant="outline" className="h-8 w-8">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Quick Status */}
      <QuickStatusBar orderId={order.id} currentStatus={order.status as ServiceOrderStatus} />

      {/* Customer & Device */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{order.customer_name}</span>
          </div>
          {order.device_label && (
            <div className="flex items-center gap-2 text-sm">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{order.device_label}</span>
            </div>
          )}
          {order.expected_deadline && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{format(new Date(order.expected_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reported Issue */}
      {order.reported_issue && (
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-muted-foreground">Problema Relatado</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-sm">{order.reported_issue}</p>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload */}
      <RepairPhotoUpload orderId={order.id} />

      {/* Diagnosis & Quote */}
      <DiagnosticQuotePanel
        serviceOrderId={order.id}
        deviceType={order.device_type}
        deviceBrand={order.device_brand}
        deviceModel={order.device_model}
        reportedIssue={order.reported_issue}
      />

      {/* Repair, Tests & Warranty */}
      <RepairTestWarrantyPanel serviceOrderId={order.id} orderStatus={order.status} />
    </div>
  );
}
