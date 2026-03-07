import { useState } from "react";
import { useCustomerByAuth, usePortalServiceOrders, usePortalQuotes, usePortalApproveQuote } from "../hooks/usePortal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const quoteStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
};

const quoteStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function PortalQuotesPage() {
  const { data: customer, isLoading: custLoading } = useCustomerByAuth();
  const { data: orders, isLoading: ordersLoading } = usePortalServiceOrders(customer?.id);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectQuoteId, setRejectQuoteId] = useState("");
  const [rejectOrderId, setRejectOrderId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const approveMutation = usePortalApproveQuote();

  // Get quotes for all orders that are awaiting approval
  const awaitingOrders = (orders || []).filter((o: any) =>
    o.status === "awaiting_customer_approval" || o.status === "awaiting_quote"
  );

  if (custLoading || ordersLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <p className="text-muted-foreground">Revise e aprove os orçamentos dos seus serviços</p>
      </div>

      {!awaitingOrders.length && !selectedOrder ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum orçamento pendente no momento.</p>
          </CardContent>
        </Card>
      ) : (
        awaitingOrders.map((order: any) => (
          <QuoteCard
            key={order.id}
            order={order}
            onApprove={async (quoteId) => {
              await approveMutation.mutateAsync({
                quoteId,
                serviceOrderId: order.id,
                decision: "approved",
              });
            }}
            onReject={(quoteId) => {
              setRejectQuoteId(quoteId);
              setRejectOrderId(order.id);
              setRejectOpen(true);
            }}
            isPending={approveMutation.isPending}
          />
        ))
      )}

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Informe o motivo da rejeição..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              await approveMutation.mutateAsync({
                quoteId: rejectQuoteId,
                serviceOrderId: rejectOrderId,
                decision: "rejected",
                reason: rejectReason,
              });
              setRejectOpen(false);
              setRejectReason("");
            }} disabled={approveMutation.isPending}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuoteCard({ order, onApprove, onReject, isPending }: {
  order: any;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
  isPending: boolean;
}) {
  const { data: quotes, isLoading } = usePortalQuotes(order.id);

  if (isLoading) return <Skeleton className="h-32" />;
  if (!quotes?.length) return null;

  return (
    <>
      {(quotes as any[]).map((q: any) => (
        <Card key={q.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-mono">{q.quote_number}</CardTitle>
                <p className="text-sm text-muted-foreground">OS: {order.order_number}</p>
              </div>
              <Badge className={quoteStatusColors[q.status]}>{quoteStatusLabels[q.status]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            {q.repair_quote_items?.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.repair_quote_items.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">R$ {Number(item.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                {q.analysis_fee > 0 && (
                  <p className="text-xs text-muted-foreground">Taxa de análise: R$ {Number(q.analysis_fee).toFixed(2)}</p>
                )}
                <p className="text-lg font-bold font-mono">
                  Total: R$ {Number(q.total_amount || 0).toFixed(2)}
                </p>
                {q.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Válido até {format(new Date(q.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
              {(q.status === "sent" || q.status === "draft") && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onReject(q.id)} disabled={isPending}>
                    <X className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                  <Button size="sm" onClick={() => onApprove(q.id)} disabled={isPending}>
                    <Check className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
