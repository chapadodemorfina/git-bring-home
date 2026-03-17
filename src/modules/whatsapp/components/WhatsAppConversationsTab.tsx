import { useState } from "react";
import { useWhatsAppConversationsPaginated } from "../hooks/useWhatsApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataPagination from "@/components/ui/data-pagination";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import WhatsAppConversationDetail from "./WhatsAppConversationDetail";

const statusColors: Record<string, string> = {
  bot_active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  waiting_human: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  human_active: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolved: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  bot_active: "Bot Ativo",
  active: "Ativa",
  waiting_human: "Aguard. Humano",
  human_active: "Humano Ativo",
  resolved: "Resolvida",
  archived: "Arquivada",
};

export default function WhatsAppConversationsTab() {
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useWhatsAppConversationsPaginated(
    filter === "all" ? undefined : filter,
    page,
  );

  const conversations = data?.items || [];
  const total = data?.total || 0;

  if (selectedId) {
    return <WhatsAppConversationDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <CardTitle>Conversas</CardTitle>
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="bot_active">Bot Ativo</SelectItem>
              <SelectItem value="waiting_human">Aguard. Humano</SelectItem>
              <SelectItem value="human_active">Humano Ativo</SelectItem>
              <SelectItem value="resolved">Resolvidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : !conversations?.length ? (
          <p className="text-center py-8 text-muted-foreground">Nenhuma conversa encontrada.</p>
        ) : (
          <>
            <div className="space-y-2">
              {conversations.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{c.customer_name || c.phone}</span>
                      <Badge className={statusColors[c.status] || ""}>{statusLabels[c.status] || c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.phone} · Última msg: {format(new Date(c.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
