import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTechQueueCounts, useTechnicianOrders } from "../hooks/useTechnicianOrders";
import { statusLabels, statusColors, priorityColors, priorityLabels } from "@/modules/service-orders/types";
import { Stethoscope, Wrench, FlaskConical, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TechDashboardPage() {
  const { data: counts, isLoading: countsLoading } = useTechQueueCounts();
  const { data: orders = [], isLoading: ordersLoading } = useTechnicianOrders();

  const cards = [
    { label: "Diagnóstico", value: counts?.diagnosis ?? 0, icon: Stethoscope, color: "text-orange-500" },
    { label: "Reparo", value: counts?.repair ?? 0, icon: Wrench, color: "text-indigo-500" },
    { label: "Teste", value: counts?.testing ?? 0, icon: FlaskConical, color: "text-cyan-500" },
    { label: "Total", value: counts?.total ?? 0, icon: AlertTriangle, color: "text-primary" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">Meu Painel</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                {countsLoading ? (
                  <Skeleton className="h-7 w-8" />
                ) : (
                  <p className="text-2xl font-bold">{c.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active orders */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Ordens Ativas</h2>
        {ordersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ordem atribuída.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 20).map((order) => (
              <Link key={order.id} to={`/tech/order/${order.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold text-sm">{order.order_number}</span>
                      <div className="flex gap-1">
                        <Badge className={`text-[10px] ${priorityColors[order.priority as keyof typeof priorityColors]}`}>
                          {priorityLabels[order.priority as keyof typeof priorityLabels]}
                        </Badge>
                        <Badge className={`text-[10px] ${statusColors[order.status as keyof typeof statusColors]}`}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{order.customer_name} · {order.device_label}</p>
                    {order.reported_issue && (
                      <p className="text-xs mt-1 truncate">{order.reported_issue}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Atualizado {formatDistanceToNow(new Date(order.updated_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
