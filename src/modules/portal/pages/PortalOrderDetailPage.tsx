import { useParams } from "react-router-dom";
import { usePortalServiceOrder, usePortalStatusHistory, usePortalQuotes, usePortalAttachments, usePortalDiagnosis } from "../hooks/usePortal";
import {
  statusLabels, statusColors,
} from "@/modules/service-orders/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, ArrowRight, Paperclip, Download, Stethoscope, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import OrderProgressStepper from "../components/OrderProgressStepper";

function PortalAttachmentLink({ att }: { att: any }) {
  const url = useSignedUrl("service-order-attachments", att.storage_path);
  return (
    <a href={url || "#"} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-primary hover:underline"
    >
      <Download className="h-4 w-4" />
      {att.file_name}
    </a>
  );
}

const viabilityLabels: Record<string, string> = {
  repairable: "Reparável",
  not_repairable: "Não Reparável",
  needs_parts: "Necessita Peças",
  needs_evaluation: "Em Avaliação",
};

const complexityLabels: Record<string, string> = {
  simple: "Simples",
  moderate: "Moderado",
  complex: "Complexo",
  expert: "Especialista",
};

export default function PortalOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = usePortalServiceOrder(id);
  const { data: history } = usePortalStatusHistory(id);
  const { data: quotes } = usePortalQuotes(id);
  const { data: attachments } = usePortalAttachments(id);
  const { data: diagnosis } = usePortalDiagnosis(id);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!order) return <p className="text-center py-12 text-muted-foreground">OS não encontrada.</p>;

  const pendingQuotes = (quotes || []).filter((q: any) => q.status === "sent" || q.status === "draft");

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* Visual Progress Stepper */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderProgressStepper currentStatus={order.status} />
        </CardContent>
      </Card>

      {/* Pending Quotes Alert */}
      {pendingQuotes.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {pendingQuotes.length} orçamento(s) aguardando sua aprovação
                </p>
                <p className="text-xs text-muted-foreground">Revise e aprove para dar continuidade</p>
              </div>
              <Button size="sm" asChild>
                <Link to="/portal/quotes">Ver</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnosis Summary */}
      {diagnosis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" /> Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {diagnosis.repair_viability && (
                <div>
                  <p className="text-xs text-muted-foreground">Viabilidade</p>
                  <p className="text-sm font-medium">{viabilityLabels[diagnosis.repair_viability] || diagnosis.repair_viability}</p>
                </div>
              )}
              {diagnosis.repair_complexity && (
                <div>
                  <p className="text-xs text-muted-foreground">Complexidade</p>
                  <p className="text-sm font-medium">{complexityLabels[diagnosis.repair_complexity] || diagnosis.repair_complexity}</p>
                </div>
              )}
              {diagnosis.estimated_cost > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Custo Estimado</p>
                  <p className="text-sm font-bold font-mono">R$ {Number(diagnosis.estimated_cost).toFixed(2)}</p>
                </div>
              )}
            </div>
            {diagnosis.probable_cause && (
              <div>
                <p className="text-xs text-muted-foreground">Causa Provável</p>
                <p className="text-sm">{diagnosis.probable_cause}</p>
              </div>
            )}
            {diagnosis.technical_findings && (
              <div>
                <p className="text-xs text-muted-foreground">Achados Técnicos</p>
                <p className="text-sm">{diagnosis.technical_findings}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Details */}
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

      {/* Status Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Status</CardTitle></CardHeader>
        <CardContent>
          {history?.length ? (
            <div className="relative space-y-3">
              {(history as any[]).map((entry: any, i: number) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {i < history.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      {entry.from_status && (
                        <>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {statusLabels[entry.from_status as keyof typeof statusLabels]}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge className={statusColors[entry.to_status as keyof typeof statusColors] + " text-[10px] h-5"}>
                        {statusLabels[entry.to_status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
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

      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Paperclip className="h-4 w-4" /> Anexos</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(attachments as any[]).map((att: any) => (
                <PortalAttachmentLink key={att.id} att={att} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
