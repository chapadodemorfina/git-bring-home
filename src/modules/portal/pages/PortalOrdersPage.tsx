import { Link } from "react-router-dom";
import { useCustomerByAuth, usePortalServiceOrders } from "../hooks/usePortal";
import {
  statusLabels, statusColors,
} from "@/modules/service-orders/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalOrdersPage() {
  const { data: customer, isLoading: custLoading, error: custError } = useCustomerByAuth();
  const { data: orders, isLoading: ordersLoading } = usePortalServiceOrders(customer?.id);

  if (custLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (custError) return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Nenhum cadastro de cliente encontrado para sua conta.</p>
        <p className="text-sm text-muted-foreground mt-1">Certifique-se de que seu email está cadastrado como cliente no sistema.</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {customer?.full_name}!</h1>
        <p className="text-muted-foreground">Acompanhe suas ordens de serviço</p>
      </div>

      {ordersLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !orders?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma ordem de serviço encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Link key={order.id} to={`/portal/order/${order.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-sm">{order.order_number}</span>
                        <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {order.device_label || "Dispositivo não especificado"}
                        {order.reported_issue && ` · ${order.reported_issue}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
