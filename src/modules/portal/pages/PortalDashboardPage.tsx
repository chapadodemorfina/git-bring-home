import { useCustomerByAuth, usePortalServiceOrders, usePortalWarranties } from "../hooks/usePortal";
import { statusLabels, statusColors } from "@/modules/service-orders/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  ClipboardList, CheckCircle, Clock, AlertTriangle, Shield,
  ChevronRight, Wrench, Package,
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PortalDashboardPage() {
  const { data: customer, isLoading: custLoading, error: custError } = useCustomerByAuth();
  const { data: orders, isLoading: ordersLoading } = usePortalServiceOrders(customer?.id);
  const { data: warranties, isLoading: warrantyLoading } = usePortalWarranties(customer?.id);

  if (custLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (custError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
          <p className="font-medium">Nenhum cadastro encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Certifique-se de que seu email ou telefone está cadastrado como cliente no sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allOrders = orders || [];
  const activeOrders = allOrders.filter((o: any) => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = allOrders.filter((o: any) => o.status === "delivered");
  const awaitingApproval = allOrders.filter((o: any) => o.status === "awaiting_customer_approval");
  const activeWarranties = (warranties || []).filter((w: any) => !w.is_void && !isPast(new Date(w.end_date)));

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Olá, {customer?.full_name}!</h1>
        <p className="text-muted-foreground">Bem-vindo ao Portal do Cliente</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Em andamento</span>
            </div>
            <p className="text-2xl font-bold">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Aguardando Aprovação</span>
            </div>
            <p className="text-2xl font-bold">{awaitingApproval.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Concluídos</span>
            </div>
            <p className="text-2xl font-bold">{completedOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Garantias Ativas</span>
            </div>
            <p className="text-2xl font-bold">{activeWarranties.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert */}
      {awaitingApproval.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">
                    {awaitingApproval.length} orçamento(s) aguardando sua aprovação
                  </p>
                  <p className="text-xs text-muted-foreground">Revise e aprove para dar continuidade ao reparo</p>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link to="/portal/quotes">Ver Orçamentos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Repairs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Reparos Ativos</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portal/orders">Ver todos <ChevronRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        {ordersLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : activeOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum reparo em andamento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeOrders.slice(0, 5).map((order: any) => (
              <Link key={order.id} to={`/portal/order/${order.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-sm">{order.order_number}</span>
                          <Badge className={statusColors[order.status as keyof typeof statusColors] + " text-[10px]"}>
                            {statusLabels[order.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.device_label || "Dispositivo"} · {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Active Warranties */}
      {activeWarranties.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Garantias Ativas</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal/warranties">Ver todas <ChevronRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-2">
            {activeWarranties.slice(0, 3).map((w: any) => {
              const daysLeft = differenceInDays(new Date(w.end_date), new Date());
              return (
                <Card key={w.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">{w.warranty_number} · OS: {w.order_number}</p>
                          <p className="text-xs text-muted-foreground">{daysLeft} dias restantes</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Ativa</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent History */}
      {completedOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Histórico Recente</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portal/orders">Ver todos <ChevronRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-2">
            {completedOrders.slice(0, 3).map((order: any) => (
              <Link key={order.id} to={`/portal/order/${order.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer opacity-75">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{order.order_number}</span>
                          <Badge variant="outline" className="text-[10px]">Entregue</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.device_label} · {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
