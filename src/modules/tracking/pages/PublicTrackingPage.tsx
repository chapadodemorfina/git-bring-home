import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicTrackOrder, usePublicApproveRejectQuote } from "../hooks/usePublicTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2, Circle, Clock, Package, Truck, Shield, CreditCard,
  MessageCircle, AlertTriangle, XCircle, Wrench, ClipboardCheck, Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; description: string; icon: any; color: string; step: number }> = {
  received: { label: "Equipamento recebido", description: "Seu equipamento foi recebido e registrado.", icon: Package, color: "text-blue-500", step: 1 },
  triage: { label: "Em triagem", description: "Estamos avaliando seu equipamento.", icon: Search, color: "text-blue-500", step: 1 },
  awaiting_diagnosis: { label: "Em diagnóstico", description: "Nossos técnicos estão analisando o problema.", icon: Search, color: "text-amber-500", step: 2 },
  awaiting_quote: { label: "Preparando orçamento", description: "Estamos preparando o orçamento do reparo.", icon: ClipboardCheck, color: "text-amber-500", step: 2 },
  awaiting_customer_approval: { label: "Aguardando sua aprovação", description: "O orçamento está pronto. Aguardamos sua decisão.", icon: Clock, color: "text-orange-500", step: 3 },
  awaiting_parts: { label: "Aguardando peças", description: "Estamos aguardando a chegada de peças necessárias.", icon: Clock, color: "text-amber-500", step: 4 },
  in_repair: { label: "Reparo em andamento", description: "Seu equipamento está sendo reparado.", icon: Wrench, color: "text-blue-600", step: 4 },
  in_testing: { label: "Em testes", description: "Realizando testes de qualidade.", icon: ClipboardCheck, color: "text-indigo-500", step: 5 },
  ready_for_pickup: { label: "Pronto para retirada", description: "Seu equipamento está pronto! Venha buscar.", icon: CheckCircle2, color: "text-green-500", step: 6 },
  delivered: { label: "Entregue", description: "Equipamento entregue com sucesso.", icon: CheckCircle2, color: "text-green-600", step: 7 },
  cancelled: { label: "Cancelado", description: "Esta ordem foi cancelada.", icon: XCircle, color: "text-destructive", step: 0 },
  warranty_return: { label: "Retorno de garantia", description: "Retorno em garantia registrado.", icon: Shield, color: "text-purple-500", step: 1 },
};

const TIMELINE_STEPS = [
  { key: "received", label: "Recebido" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "quote", label: "Orçamento" },
  { key: "repair", label: "Reparo" },
  { key: "testing", label: "Testes" },
  { key: "ready", label: "Pronto" },
  { key: "delivered", label: "Entregue" },
];

function getStepFromStatus(status: string): number {
  return STATUS_MAP[status]?.step ?? 0;
}

function getTimelineStepStatus(stepIndex: number, currentStep: number): "completed" | "current" | "pending" {
  if (stepIndex + 1 < currentStep) return "completed";
  if (stepIndex + 1 === currentStep) return "current";
  return "pending";
}

export default function PublicTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicTrackOrder(token);
  const approveReject = usePublicApproveRejectQuote();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; decision: string }>({ open: false, decision: "" });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl"><CardContent className="pt-6 space-y-4">
          <Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /><Skeleton className="h-32 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  if (error || !data || data.error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Link inválido ou expirado</h2>
            <p className="text-muted-foreground text-sm">
              Este link de acompanhamento não é mais válido. Entre em contato com a assistência para obter um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[data.status] || STATUS_MAP.received;
  const StatusIcon = statusInfo.icon;
  const currentStep = getStepFromStatus(data.status);
  const quote = data.quote;
  const canApprove = quote && quote.status === "sent";
  const whatsappNumber = data.whatsapp_number || "";
  const companyName = data.company_name || "i9 Solution";
  const whatsappMsg = encodeURIComponent(`Olá! Gostaria de informações sobre a OS ${data.order_number}.`);

  const handleQuoteAction = (decision: string) => {
    setConfirmDialog({ open: true, decision });
  };

  const confirmQuoteAction = async () => {
    if (!token || !quote?.id) return;
    await approveReject.mutateAsync({ token, quoteId: quote.id, decision: confirmDialog.decision });
    setConfirmDialog({ open: false, decision: "" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm opacity-80 mb-1">Acompanhamento de Serviço</p>
          <h1 className="text-2xl font-bold font-mono">{data.order_number}</h1>
          {data.customer_name && <p className="text-sm opacity-80 mt-1">{data.customer_name}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 -mt-2">
        {/* Status Hero */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
              <div>
                <h2 className="text-lg font-semibold">{statusInfo.label}</h2>
                <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
              </div>
            </div>
            {data.device_label && (
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-medium">Dispositivo:</span> {data.device_label}
              </p>
            )}
            {data.reported_issue && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Problema:</span> {data.reported_issue}
              </p>
            )}
            {data.collection_point_name && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Recebido via:</span> {data.collection_point_name}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Progress Timeline */}
        {data.status !== "cancelled" && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Progresso</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-1">
                {TIMELINE_STEPS.map((step, i) => {
                  const stepStatus = getTimelineStepStatus(i, currentStep);
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        stepStatus === "completed" ? "bg-primary text-primary-foreground" :
                        stepStatus === "current" ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {stepStatus === "completed" ? "✓" : i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 text-center leading-tight ${
                        stepStatus !== "pending" ? "font-medium text-foreground" : "text-muted-foreground"
                      }`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Detail */}
        {data.timeline && data.timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.timeline.map((entry: any, i: number) => {
                  const info = STATUS_MAP[entry.status];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 ${i === data.timeline.length - 1 ? "text-primary" : "text-muted-foreground"}`}>
                        {i === data.timeline.length - 1 ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{info?.label || entry.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Card */}
        {quote && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{quote.quote_number}</span>
                <Badge variant={quote.status === "approved" ? "default" : quote.status === "sent" ? "secondary" : "outline"}>
                  {quote.status === "sent" ? "Aguardando aprovação" :
                   quote.status === "approved" ? "Aprovado" :
                   quote.status === "rejected" ? "Recusado" :
                   quote.status === "expired" ? "Expirado" : quote.status}
                </Badge>
              </div>
              <div className="text-2xl font-bold">
                R$ {Number(quote.total_amount || 0).toFixed(2).replace(".", ",")}
              </div>
              {canApprove && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => handleQuoteAction("approved")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => handleQuoteAction("rejected")}>
                      <XCircle className="mr-2 h-4 w-4" /> Recusar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Logistics */}
        {data.logistics && data.logistics.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Logística
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.logistics.map((l: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{l.type === "pickup" ? "Coleta" : "Entrega"}</p>
                    {l.scheduled_date && (
                      <p className="text-xs text-muted-foreground">
                        Agendado: {format(new Date(l.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{l.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Warranty */}
        {data.warranty && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Garantia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-mono">{data.warranty.warranty_number}</span>
                <Badge variant={data.warranty.is_active ? "default" : "outline"}>
                  {data.warranty.is_active ? "Ativa" : data.warranty.is_void ? "Anulada" : "Expirada"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Início: {format(new Date(data.warranty.start_date), "dd/MM/yyyy")}</p>
                <p>Fim: {format(new Date(data.warranty.end_date), "dd/MM/yyyy")}</p>
                {data.warranty.coverage && <p>Cobertura: {data.warranty.coverage}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Balance */}
        {data.balance && data.balance.status !== "none" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">R$ {Number(data.balance.total).toFixed(2).replace(".", ",")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-semibold text-green-600">R$ {Number(data.balance.paid).toFixed(2).replace(".", ",")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Restante</p>
                  <p className="font-semibold text-orange-600">R$ {Number(data.balance.remaining).toFixed(2).replace(".", ",")}</p>
                </div>
              </div>
              <div className="mt-2 text-center">
                <Badge variant={
                  data.balance.status === "paid" ? "default" :
                  data.balance.status === "overdue" ? "destructive" : "secondary"
                }>
                  {data.balance.status === "paid" ? "Pago" :
                   data.balance.status === "partial" ? "Parcial" :
                   data.balance.status === "overdue" ? "Em atraso" : "Pendente"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support CTA */}
        {whatsappNumber && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3 text-center">Precisa de ajuda?</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          {companyName} · Assistência Técnica
        </p>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(o) => !o && setConfirmDialog({ open: false, decision: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.decision === "approved" ? "Confirmar aprovação?" : "Confirmar recusa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.decision === "approved"
                ? `Você está aprovando o orçamento ${quote?.quote_number} no valor de R$ ${Number(quote?.total_amount || 0).toFixed(2).replace(".", ",")}. Esta ação não pode ser desfeita.`
                : `Você está recusando o orçamento ${quote?.quote_number}. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmQuoteAction} disabled={approveReject.isPending}>
              {approveReject.isPending ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
