import { useState } from "react";
import { RepairQuote, quoteStatusLabels } from "../types";
import { useRecordApproval, useQuoteApprovals } from "../hooks/useDiagnostics";
import { useAutoSendMessage } from "@/modules/messaging/hooks/useCustomerMessaging";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  quote: RepairQuote;
  serviceOrderId: string;
}

export default function ApprovalControls({ quote, serviceOrderId }: Props) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [decidedByName, setDecidedByName] = useState("");
  const [reason, setReason] = useState("");
  const [chargeAnalysisFee, setChargeAnalysisFee] = useState(false);
  const recordApproval = useRecordApproval();
  const { data: approvals } = useQuoteApprovals(quote.id);
  const autoSend = useAutoSendMessage();

  const canDecide = quote.status === "sent";

  const sendApprovalWhatsApp = async () => {
    try {
      const db = supabase as any;
      const { data: so } = await db
        .from("service_orders")
        .select("order_number, customer_id, customers(full_name, phone, whatsapp)")
        .eq("id", serviceOrderId)
        .single();
      const phone = so?.customers?.whatsapp || so?.customers?.phone;
      if (phone && so?.customer_id) {
        autoSend({
          customerId: so.customer_id,
          phone,
          eventType: "quote_approved",
          referenceType: "quote",
          referenceId: quote.id,
          templateKey: "quote_approved_whatsapp",
          variables: {
            customer_name: so.customers?.full_name || "Cliente",
            order_number: so.order_number,
            approved_amount: Number(quote.total_amount).toFixed(2),
          },
        });
      }
    } catch {
      // non-blocking
    }
  };

  const handleApprove = async () => {
    await recordApproval.mutateAsync({
      quoteId: quote.id,
      serviceOrderId,
      decision: "approved",
      decidedByName: decidedByName || undefined,
      reason: reason || undefined,
    });
    // Auto-send WhatsApp notification
    sendApprovalWhatsApp();
    setApproveOpen(false);
    resetForm();
  };

  const handleReject = async () => {
    await recordApproval.mutateAsync({
      quoteId: quote.id,
      serviceOrderId,
      decision: "rejected",
      decidedByName: decidedByName || undefined,
      reason: reason || undefined,
      chargeAnalysisFee,
    });
    setRejectOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDecidedByName("");
    setReason("");
    setChargeAnalysisFee(false);
  };

  return (
    <>
      {canDecide && (
        <div className="flex gap-2">
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setApproveOpen(true)}>
            <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
          </Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" /> Rejeitar
          </Button>
        </div>
      )}

      {/* Approval history */}
      {approvals && approvals.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Histórico de Decisões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                {a.decision === "approved" ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={a.decision === "approved" ? "default" : "destructive"}>
                      {a.decision === "approved" ? "Aprovado" : "Rejeitado"}
                    </Badge>
                    {a.decided_by_name && <span className="text-sm font-medium">{a.decided_by_name}</span>}
                  </div>
                  {a.reason && <p className="text-sm text-muted-foreground">{a.reason}</p>}
                  {a.charge_analysis_fee && (
                    <p className="text-xs text-orange-600 mt-1">Taxa de análise será cobrada</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aprovar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome de quem aprovou</Label>
              <Input value={decidedByName} onChange={(e) => setDecidedByName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={recordApproval.isPending}>
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome de quem rejeitou</Label>
              <Input value={decidedByName} onChange={(e) => setDecidedByName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>Motivo da rejeição</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motivo..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={chargeAnalysisFee} onCheckedChange={setChargeAnalysisFee} />
              <Label>Cobrar taxa de análise</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={recordApproval.isPending}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
