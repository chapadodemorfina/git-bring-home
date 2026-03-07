import { useState } from "react";
import { useWorkQueues, QueueType } from "@/hooks/useWorkQueues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Stethoscope, Wrench, TestTube, Package } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  received: "Recebido", triage: "Triagem", awaiting_diagnosis: "Aguard. Diagnóstico",
  awaiting_quote: "Aguard. Orçamento", awaiting_customer_approval: "Aguard. Aprovação",
  in_repair: "Em Reparo", awaiting_parts: "Aguard. Peças", in_testing: "Em Teste",
  ready_for_pickup: "Pronto Retirada",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const QUEUES = [
  { key: "diagnosis" as QueueType, label: "Diagnóstico", icon: Stethoscope },
  { key: "repair" as QueueType, label: "Reparo", icon: Wrench },
  { key: "testing" as QueueType, label: "Testes", icon: TestTube },
  { key: "pickup" as QueueType, label: "Retirada", icon: Package },
];

export default function WorkQueuesPage() {
  const [queue, setQueue] = useState<QueueType>("diagnosis");
  const [priority, setPriority] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useWorkQueues(queue, null, priority, false, page, 25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Filas de Trabalho</h1>
        <p className="text-muted-foreground">Ordens de serviço organizadas por etapa do fluxo</p>
      </div>

      <Tabs value={queue || "diagnosis"} onValueChange={(v) => { setQueue(v as QueueType); setPage(1); }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            {QUEUES.map(q => (
              <TabsTrigger key={q.key} value={q.key!} className="gap-1.5">
                <q.icon className="h-4 w-4" />
                {q.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Select value={priority || "all"} onValueChange={(v) => { setPriority(v === "all" ? null : v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {QUEUES.map(q => (
          <TabsContent key={q.key} value={q.key!}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <q.icon className="h-5 w-5" />
                  Fila de {q.label}
                  {data && <Badge variant="secondary">{data.total} OS</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : !data?.items?.length ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma OS nesta fila</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>OS</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Dispositivo</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead>Tempo no Status</TableHead>
                          <TableHead>SLA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/service-orders/${item.id}`)}
                          >
                            <TableCell className="font-medium">{item.order_number}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.device_label || "—"}</TableCell>
                            <TableCell>
                              <Badge className={PRIORITY_COLORS[item.priority] || ""}>
                                {item.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>{STATUS_LABELS[item.status] || item.status}</TableCell>
                            <TableCell>{item.technician_name || "—"}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.round(item.hours_in_status)}h
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.sla_overdue ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Excedido
                                </Badge>
                              ) : item.target_hours ? (
                                <span className="text-sm text-muted-foreground">{item.target_hours}h limite</span>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {data.total > data.page_size && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Página {data.page} de {Math.ceil(data.total / data.page_size)}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                          <Button variant="outline" size="sm" disabled={page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
