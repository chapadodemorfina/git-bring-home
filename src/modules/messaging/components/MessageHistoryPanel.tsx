import { useReferenceMessages, useResendMessage } from "../hooks/useCustomerMessaging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  payment_confirmed: "Pagamento Confirmado",
  os_ready: "OS Pronta",
  quote_approved: "Orçamento Aprovado",
  manual: "Envio Manual",
};

interface Props {
  referenceType: string;
  referenceId: string;
}

export default function MessageHistoryPanel({ referenceType, referenceId }: Props) {
  const { data: messages, isLoading } = useReferenceMessages(referenceType, referenceId);
  const resend = useResendMessage();
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (isLoading) return null;
  if (!messages?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" /> Mensagens WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {messages.map((msg: any) => {
          const cfg = statusConfig[msg.delivery_status] || statusConfig.pending;
          const Icon = cfg.icon;
          return (
            <div key={msg.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cfg.color}>
                    <Icon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {eventLabels[msg.event_type] || msg.event_type}
                  </span>
                  {msg.sent_automatically && (
                    <Badge variant="outline" className="text-[10px]">Auto</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-line line-clamp-3">{msg.message_text}</p>
              {msg.error_message && (
                <p className="text-xs text-destructive">{msg.error_message}</p>
              )}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCopy(msg.message_text)}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
                {msg.delivery_status === "failed" && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => resend.mutate(msg.id)} disabled={resend.isPending}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Reenviar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
