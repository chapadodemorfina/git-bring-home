import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const db = supabase as any;

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: RefreshCw },
  sent: { label: "Enviado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  failed: { label: "Falhou", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  skipped: { label: "Pulado", color: "bg-muted text-muted-foreground", icon: XCircle },
};

interface Props {
  serviceOrderId: string;
  customerPhone?: string | null;
  customerName?: string;
}

export default function CustomerCommunicationPanel({ serviceOrderId, customerPhone, customerName }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [manualMsg, setManualMsg] = useState("");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["so-notifications", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("notification_queue")
        .select("*")
        .eq("payload->>service_order_id", serviceOrderId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("notification_queue")
        .update({ status: "pending", next_attempt_at: new Date().toISOString(), error_message: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["so-notifications", serviceOrderId] });
      toast({ title: "Mensagem reenfileirada!" });
    },
  });

  const sendManualMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!customerPhone) throw new Error("Cliente sem telefone cadastrado");
      const { error } = await db.from("notification_queue").insert({
        channel: "whatsapp",
        recipient_address: customerPhone,
        recipient_name: customerName || "Cliente",
        rendered_body: text,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        payload: { service_order_id: serviceOrderId, manual: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["so-notifications", serviceOrderId] });
      setManualMsg("");
      toast({ title: "Mensagem adicionada à fila!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Comunicação com Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual send */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escreva uma mensagem manual para o cliente..."
            value={manualMsg}
            onChange={(e) => setManualMsg(e.target.value)}
            rows={3}
          />
          <Button
            size="sm"
            disabled={!manualMsg.trim() || sendManualMutation.isPending}
            onClick={() => sendManualMutation.mutate(manualMsg.trim())}
          >
            <Send className="mr-2 h-4 w-4" />
            Enviar via WhatsApp
          </Button>
          {!customerPhone && (
            <p className="text-xs text-destructive">Cliente sem telefone cadastrado.</p>
          )}
        </div>

        {/* Message history */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Histórico de Mensagens</h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !messages?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada ainda.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {messages.map((msg: any) => {
                const cfg = statusConfig[msg.status] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <div key={msg.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={cfg.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-line line-clamp-4">{msg.rendered_body}</p>
                    {msg.error_message && (
                      <p className="text-xs text-destructive">{msg.error_message}</p>
                    )}
                    {msg.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryMutation.mutate(msg.id)}
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" /> Reenviar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
