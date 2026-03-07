import { useParams } from "react-router-dom";
import { usePortalServiceOrder, usePortalStatusHistory, usePortalQuotes, usePortalAttachments } from "../hooks/usePortal";
import {
  statusLabels, statusColors, priorityLabels,
} from "@/modules/service-orders/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, ArrowRight, Paperclip, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export default function PortalOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = usePortalServiceOrder(id);
  const { data: history } = usePortalStatusHistory(id);
  const { data: quotes } = usePortalQuotes(id);
  const { data: attachments } = usePortalAttachments(id);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!order) return <p className="text-center py-12 text-muted-foreground">OS não encontrada.</p>;

  const pendingQuotes = (quotes || []).filter((q: any) => q.status === "sent" || q.status === "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/portal"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono">{order.order_number}</h1>
            <Badge className={statusColors[order.status as keyof typeof statusColors]}>
              {statusLabels[order.status as keyof typeof statusLabels]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardHeader><CardTitle className="text-base">Acompanhamento</CardTitle></CardHeader>
        <CardContent>
          {history?.length ? (
            <div className="relative space-y-4">
              {(history as any[]).map((entry: any, i: number) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    {i < history.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {entry.from_status && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {statusLabels[entry.from_status as keyof typeof statusLabels]}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge className={statusColors[entry.to_status as keyof typeof statusColors]}>
                        {statusLabels[entry.to_status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum histórico disponível.</p>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalhes do Serviço</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {order.device_label && (
            <div>
              <p className="text-xs text-muted-foreground">Dispositivo</p>
              <p className="text-sm font-medium">{order.device_label}</p>
            </div>
          )}
          {order.reported_issue && (
            <div>
              <p className="text-xs text-muted-foreground">Problema Relatado</p>
              <p className="text-sm">{order.reported_issue}</p>
            </div>
          )}
          {order.expected_deadline && (
            <div>
              <p className="text-xs text-muted-foreground">Prazo Estimado</p>
              <p className="text-sm font-medium">{format(new Date(order.expected_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Quotes Alert */}
      {pendingQuotes.length > 0 && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <p className="text-sm font-medium">Você tem {pendingQuotes.length} orçamento(s) aguardando aprovação.</p>
            <Button size="sm" className="mt-2" asChild>
              <Link to="/portal/quotes">Ver Orçamentos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(attachments as any[]).map((att: any) => {
                const url = supabase.storage.from("service-order-attachments").getPublicUrl(att.storage_path).data.publicUrl;
                return (
                  <a key={att.id} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {att.file_name}
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
