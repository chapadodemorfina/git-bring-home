import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SearchInput } from "@/components/ui/search-input";
import {
  MessageSquare,
  Bell,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MessagesSquare,
  Mail,
  Search,
  ExternalLink,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";

const db = supabase as any;

function useCommunicationSummary() {
  return useQuery({
    queryKey: ["communication-hub-summary"],
    queryFn: async () => {
      const now = new Date();
      const last7d = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [
        recentMessages,
        pendingQueue,
        failedQueue,
        activeConversations,
        pendingHandoffs,
        recentNotifLogs,
      ] = await Promise.all([
        db
          .from("customer_message_events")
          .select("id", { count: "exact", head: true })
          .gte("created_at", last7d),
        db
          .from("notification_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        db
          .from("notification_queue")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed"),
        db
          .from("whatsapp_conversations")
          .select("id", { count: "exact", head: true })
          .in("status", ["active", "human_active", "human_pending"]),
        db
          .from("whatsapp_handoffs")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        db
          .from("notification_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", last7d),
      ]);

      return {
        recentMessages: recentMessages.count ?? 0,
        pendingQueue: pendingQueue.count ?? 0,
        failedQueue: failedQueue.count ?? 0,
        activeConversations: activeConversations.count ?? 0,
        pendingHandoffs: pendingHandoffs.count ?? 0,
        recentNotifLogs: recentNotifLogs.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

export default function CommunicationHubDashboard() {
  const { data, isLoading } = useCommunicationSummary();
  const [, setParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const goTab = (tab: string) => setParams({ tab });

  const kpis = [
    { label: "Mensagens (7d)", value: data?.recentMessages ?? 0, icon: Send, color: "text-blue-500" },
    { label: "Conversas Ativas", value: data?.activeConversations ?? 0, icon: MessagesSquare, color: "text-green-500" },
    { label: "Fila Pendente", value: data?.pendingQueue ?? 0, icon: Clock, color: "text-yellow-500" },
    { label: "Falhas de Envio", value: data?.failedQueue ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Aguard. Atendimento", value: data?.pendingHandoffs ?? 0, icon: MessageSquare, color: "text-orange-500" },
    { label: "Notificações (7d)", value: data?.recentNotifLogs ?? 0, icon: Bell, color: "text-purple-500" },
  ];

  const alerts: { label: string; count: number; action: string }[] = [];
  if (data) {
    if (data.pendingHandoffs > 0) alerts.push({ label: "Conversas aguardando atendimento humano", count: data.pendingHandoffs, action: "whatsapp" });
    if (data.pendingQueue > 0) alerts.push({ label: "Notificações pendentes de envio", count: data.pendingQueue, action: "notifications" });
    if (data.failedQueue > 0) alerts.push({ label: "Falhas de envio de notificação", count: data.failedQueue, action: "notifications" });
  }

  const handleSearch = (v: string) => {
    setSearch(v);
    if (v.trim()) goTab("messages");
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <k.icon className={`h-5 w-5 ${k.color}`} />
              <span className="text-2xl font-bold">{isLoading ? "—" : k.value}</span>
              <span className="text-xs text-muted-foreground leading-tight">{k.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions + alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick actions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => goTab("whatsapp")}>
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => goTab("messages")}>
                <Mail className="h-4 w-4" /> Mensagens
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => goTab("notifications")}>
                <Bell className="h-4 w-4" /> Notificações
              </Button>
              <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => goTab("whatsapp")}>
                <MessagesSquare className="h-4 w-4" /> Histórico
              </Button>
            </div>
            <SearchInput
              value={search}
              onSearch={handleSearch}
              placeholder="Buscar comunicação..."
              containerClassName="mt-2"
            />
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Atenção
            </h3>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Nenhum alerta no momento
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => goTab(a.action)}
                    className="w-full flex items-center justify-between rounded-md border p-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span>{a.label}</span>
                    <Badge variant="destructive" className="ml-2">{a.count}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
