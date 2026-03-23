import { useState } from "react";
import { useCustomerMessageEvents, useResendMessage } from "../hooks/useCustomerMessaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataPagination from "@/components/ui/data-pagination";
import { SearchInput } from "@/components/ui/search-input";
import { MessageSquare, RefreshCw, CheckCircle, XCircle, Clock, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  sent: { label: "Enviado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  failed: { label: "Falhou", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

const eventLabels: Record<string, string> = {
  sale_completed: "Venda Concluída",
  payment_confirmed: "Pagamento",
  os_ready: "OS Pronta",
  quote_approved: "Orçamento Aprovado",
  manual: "Manual",
};

export default function MessageHistoryPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [status, setStatus] = useState("all");
  const resend = useResendMessage();

  const { data, isLoading } = useCustomerMessageEvents(
    {
      eventType: eventType === "all" ? undefined : eventType,
      status: status === "all" ? undefined : status,
      search: search || undefined,
    },
    page,
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Histórico de Mensagens
        </h1>
        <p className="text-muted-foreground">Todas as mensagens enviadas por WhatsApp para clientes</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo de evento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="sale_completed">Venda Concluída</SelectItem>
            <SelectItem value="payment_confirmed">Pagamento</SelectItem>
            <SelectItem value="os_ready">OS Pronta</SelectItem>
            <SelectItem value="quote_approved">Orçamento Aprovado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : !data?.items?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma mensagem encontrada.</TableCell>
                  </TableRow>
                ) : data.items.map((msg: any) => {
                  const cfg = statusConfig[msg.delivery_status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={msg.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(msg.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{msg.customers?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm font-mono">{msg.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{eventLabels[msg.event_type] || msg.event_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{msg.message_text}</TableCell>
                      <TableCell>
                        <Badge className={cfg.color}>
                          <Icon className="h-3 w-3 mr-1" />{cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{msg.sent_automatically ? "Auto" : "Manual"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(msg.message_text)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          {msg.delivery_status === "failed" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resend.mutate(msg.id)} disabled={resend.isPending}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {data && (
            <div className="p-4 border-t">
              <DataPagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
