import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTechnicianOrders } from "../hooks/useTechnicianOrders";
import { statusLabels, statusColors, priorityColors, priorityLabels } from "@/modules/service-orders/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const queueTabs = [
  { value: "diagnosis", label: "Diagnóstico", statuses: ["triage", "awaiting_diagnosis"] },
  { value: "repair", label: "Reparo", statuses: ["in_repair", "awaiting_parts"] },
  { value: "testing", label: "Testes", statuses: ["in_testing"] },
  { value: "all", label: "Todos", statuses: undefined },
];

export default function TechQueuePage() {
  const [tab, setTab] = useState("diagnosis");
  const currentTab = queueTabs.find((t) => t.value === tab)!;
  const { data: orders = [], isLoading } = useTechnicianOrders(currentTab.statuses);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Fila de Trabalho</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          {queueTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma ordem nesta fila.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
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
                        {formatDistanceToNow(new Date(order.updated_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
