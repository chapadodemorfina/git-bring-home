import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare, Bell, Send, AlertTriangle, Clock,
  MessagesSquare, Mail,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

const db = supabase as any;

function useCommunicationSummary() {
  return useQuery({
    queryKey: ["communication-hub-summary"],
    queryFn: async () => {
      const now = new Date();
      const last7d = new Date(now.getTime() - 7 * 86400000).toISOString();
      const [recentMessages, pendingQueue, failedQueue, activeConversations, pendingHandoffs, recentNotifLogs] = await Promise.all([
        db.from("customer_message_events").select("id", { count: "exact", head: true }).gte("created_at", last7d),
        db.from("notification_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("notification_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
        db.from("whatsapp_conversations").select("id", { count: "exact", head: true }).in("status", ["active", "human_active", "human_pending"]),
        db.from("whatsapp_handoffs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        db.from("notification_logs").select("id", { count: "exact", head: true }).gte("created_at", last7d),
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

  const goTab = (tab: string) => setParams({ tab });

  const kpis = [
    { label: "Mensagens (7d)", value: data?.recentMessages ?? 0, icon: Send, color: "text-chart-1" },
    { label: "Conversas Ativas", value: data?.activeConversations ?? 0, icon: MessagesSquare, color: "text-chart-2" },
    { label: "Fila Pendente", value: data?.pendingQueue ?? 0, icon: Clock, color: "text-chart-5" },
    { label: "Falhas de Envio", value: data?.failedQueue ?? 0, icon: AlertTriangle, color: data?.failedQueue ? "text-destructive" : "text-muted-foreground" },
    { label: "Aguard. Atendimento", value: data?.pendingHandoffs ?? 0, icon: MessageSquare, color: "text-chart-3" },
    { label: "Notificações (7d)", value: data?.recentNotifLogs ?? 0, icon: Bell, color: "text-chart-4" },
  ];

  const shortcuts = [
    { label: "WhatsApp", icon: MessageSquare, onClick: () => goTab("whatsapp") },
    { label: "Mensagens", icon: Mail, onClick: () => goTab("messages") },
    { label: "Notificações", icon: Bell, onClick: () => goTab("notifications") },
  ];

  const alerts: { label: string; color: string }[] = [];
  if (data) {
    if (data.pendingHandoffs > 0) alerts.push({ label: `${data.pendingHandoffs} conversa(s) aguardando atendimento humano`, color: "bg-chart-3/10 text-chart-3 border-chart-3/20" });
    if (data.pendingQueue > 0) alerts.push({ label: `${data.pendingQueue} notificação(ões) pendente(s) de envio`, color: "bg-chart-5/10 text-chart-5 border-chart-5/20" });
    if (data.failedQueue > 0) alerts.push({ label: `${data.failedQueue} falha(s) de envio de notificação`, color: "bg-destructive/10 text-destructive border-destructive/20" });
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2 px-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Button key={s.label} variant="outline" size="sm" onClick={s.onClick} className="gap-1.5">
            <s.icon className="h-4 w-4" />
            {s.label}
          </Button>
        ))}
      </div>

      {/* Attention Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Badge key={a.label} variant="outline" className={`${a.color} text-xs py-1 px-2.5 font-medium`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {a.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
