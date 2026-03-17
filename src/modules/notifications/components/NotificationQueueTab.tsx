import { useState } from "react";
import { useNotificationQueuePaginated, useRetryNotification } from "../hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataPagination from "@/components/ui/data-pagination";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-muted text-muted-foreground",
  skipped: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function NotificationQueueTab() {
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterChannel, setFilterChannel] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationQueuePaginated({
    status: filterStatus,
    channel: filterChannel,
  }, page);
  const retryMut = useRetryNotification();
  const queue = data?.items || [];
  const total = data?.total || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <CardTitle>Fila de Notificações</CardTitle>
          <div className="flex gap-2">
            <Select value={filterStatus || "all"} onValueChange={(v) => { setFilterStatus(v === "all" ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="skipped">Ignorado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterChannel || "all"} onValueChange={(v) => { setFilterChannel(v === "all" ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : !queue.length ? (
          <p className="text-center py-8 text-muted-foreground">Fila vazia.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell><Badge variant="outline">{q.channel}</Badge></TableCell>
                      <TableCell className="text-sm">
                        <div>{q.recipient_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{q.recipient_address}</div>
                      </TableCell>
                      <TableCell><Badge className={statusColors[q.status] || ""}>{q.status}</Badge></TableCell>
                      <TableCell>{q.attempts}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">{q.error_message || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(q.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {(q.status === "failed" || q.status === "skipped") && (
                          <Button size="icon" variant="ghost" onClick={() => retryMut.mutate(q.id)} title="Reenviar">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
