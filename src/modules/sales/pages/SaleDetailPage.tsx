import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSale, useSaleItems, useSalePayments, useSaleReturns, useCancelSale, useCompleteSale, useAddSalePayment, useProcessReturn } from "../hooks/useSales";
import { useOpenCashRegister, useAddCashMovement } from "@/modules/cash-register/hooks/useCashRegister";
import { saleStatusLabels, saleStatusColors, paymentStatusLabels, paymentMethodLabels, SalePaymentMethod } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Printer, XCircle, RotateCcw, Plus, FileText, Pencil, Receipt, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateSaleReceiptPdf } from "@/lib/pdf-generators/sale-receipt-pdf";
import { generateSaleThermalReceiptPdf } from "@/lib/pdf-generators/sale-thermal-receipt-pdf";
import WhatsAppSendButton from "@/modules/messaging/components/WhatsAppSendButton";
import MessageHistoryPanel from "@/modules/messaging/components/MessageHistoryPanel";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const companySettings = useCompanySettings();
  const companyName = companySettings.company_name;

  const { data: sale, isLoading } = useSale(id);
  const { data: items } = useSaleItems(id);
  const { data: payments } = useSalePayments(id);
  const { data: returns } = useSaleReturns(id);

  // Fetch customer phone for WhatsApp
  const { data: customerData } = useQuery({
    queryKey: ["sale-customer-phone", sale?.customer_id],
    enabled: !!sale?.customer_id,
    queryFn: async () => {
      const sdb = supabase as any;
      const { data } = await sdb.from("customers").select("phone, whatsapp").eq("id", sale!.customer_id).single();
      return data as { phone: string | null; whatsapp: string | null } | null;
    },
  });
  const customerPhone = customerData?.whatsapp || customerData?.phone || null;

  const cancelSale = useCancelSale();
  const completeSale = useCompleteSale();
  const addPayment = useAddSalePayment();
  const processReturn = useProcessReturn();
  const { data: openCashRegister } = useOpenCashRegister();
  const addCashMovement = useAddCashMovement();

  // Cancel dialog
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Return dialog
  const [showReturn, setShowReturn] = useState(false);
  const [returnItemId, setReturnItemId] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState("");

  // Payment dialog
  const [showPayment, setShowPayment] = useState(false);
  const [newPayMethod, setNewPayMethod] = useState<SalePaymentMethod>("pix");
  const [newPayAmount, setNewPayAmount] = useState(0);
  const [newPayRef, setNewPayRef] = useState("");

  const canManage = hasRole("admin") || hasRole("manager") || hasRole("finance");

  if (isLoading) return <div className="space-y-4 p-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (!sale) return <p className="text-center py-12 text-muted-foreground">Venda não encontrada</p>;

  const selectedReturnItem = items?.find((i) => i.id === returnItemId);

  const handleCancel = () => {
    cancelSale.mutate({ saleId: sale.id, reason: cancelReason }, {
      onSuccess: () => setShowCancel(false),
    });
  };

  const handleReturn = () => {
    if (!selectedReturnItem) return;
    processReturn.mutate({
      sale_id: sale.id,
      sale_item_id: returnItemId,
      product_id: selectedReturnItem.product_id,
      quantity: returnQty,
      amount_refunded: (selectedReturnItem.unit_price * returnQty),
      reason: returnReason,
    }, { onSuccess: () => { setShowReturn(false); setReturnReason(""); } });
  };

  const handleAddPayment = () => {
    addPayment.mutate({
      sale_id: sale.id,
      payment_method: newPayMethod,
      amount: newPayAmount,
      reference: newPayRef || undefined,
    }, { onSuccess: () => { setShowPayment(false); setNewPayAmount(0); setNewPayRef(""); } });
  };

  const handlePrint = () => {
    if (!sale || !items) return;
    generateSaleReceiptPdf(sale, items, payments || [], companyName);
  };

  const handleThermalPrint = () => {
    if (!sale || !items) return;
    generateSaleThermalReceiptPdf(sale, items, payments || [], companyName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{sale.sale_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={saleStatusColors[sale.status]}>{saleStatusLabels[sale.status]}</Badge>
              <Badge variant="outline">{paymentStatusLabels[sale.payment_status]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> A4</Button>
          <Button variant="outline" size="sm" onClick={handleThermalPrint}><Receipt className="mr-2 h-4 w-4" /> Cupom 80mm</Button>
          {sale.status === "completed" && sale.customer_id && (
            <WhatsAppSendButton
              customerId={sale.customer_id}
              customerPhone={customerPhone}
              customerName={sale.customer_name || "Cliente"}
              eventType="sale_completed"
              referenceType="sale"
              referenceId={sale.id}
              templateKey="sale_completed_whatsapp"
              variables={{
                sale_number: sale.sale_number,
                items_summary: items?.map(i => `${i.quantity}x ${i.product_name_snapshot}`).join(", ") || "",
                total_amount: Number(sale.total_amount).toFixed(2),
                payment_method: payments?.map(p => paymentMethodLabels[p.payment_method]).join(", ") || "",
                sale_date: format(new Date(sale.completed_at || sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
              }}
              label="WhatsApp"
            />
          )}
          {sale.status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${sale.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
              <Button size="sm" onClick={() => completeSale.mutate(sale.id)}>
                <Plus className="mr-2 h-4 w-4" /> Concluir
              </Button>
            </>
          )}
          {(sale.status === "completed" || sale.status === "partially_refunded") && canManage && (
            <Button variant="outline" size="sm" onClick={() => setShowReturn(true)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Devolução
            </Button>
          )}
          {sale.status !== "cancelled" && sale.payment_status !== "paid" && sale.status !== "draft" && (
            <Button variant="outline" size="sm" onClick={() => { setNewPayAmount(Number(sale.total_amount) - (payments?.reduce((s, p) => s + Number(p.amount), 0) || 0)); setShowPayment(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Pagamento
            </Button>
          )}
          {sale.status !== "cancelled" && canManage && (
            <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground block">Cliente</span>{sale.customer_name || "Consumidor"}</div>
                <div><span className="text-muted-foreground block">Vendedor</span>{sale.seller_name || "—"}</div>
                <div><span className="text-muted-foreground block">Criada em</span>{format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                {sale.completed_at && <div><span className="text-muted-foreground block">Concluída em</span>{format(new Date(sale.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>}
                {sale.cancelled_at && <div><span className="text-muted-foreground block">Cancelada em</span>{format(new Date(sale.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>}
              </div>
              {sale.notes && <p className="mt-3 text-sm text-muted-foreground">{sale.notes}</p>}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Itens ({items?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {!items?.length ? <p className="text-muted-foreground text-center py-4">Nenhum item</p> : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Preço Un.</TableHead>
                        <TableHead className="text-right">Desc.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name_snapshot}</TableCell>
                          <TableCell className="text-muted-foreground">{item.sku_snapshot || "—"}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">R$ {Number(item.unit_price).toFixed(2).replace(".", ",")}</TableCell>
                          <TableCell className="text-right">{Number(item.discount_amount) > 0 ? `R$ ${Number(item.discount_amount).toFixed(2).replace(".", ",")}` : "—"}</TableCell>
                          <TableCell className="text-right font-medium">R$ {Number(item.total_amount).toFixed(2).replace(".", ",")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Returns */}
          {returns && returns.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Devoluções ({returns.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{format(new Date(r.returned_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell>R$ {Number(r.amount_refunded).toFixed(2).replace(".", ",")}</TableCell>
                          <TableCell>{r.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Totals + Payments */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Totais</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>R$ {Number(sale.subtotal).toFixed(2).replace(".", ",")}</span></div>
              {Number(sale.discount_amount) > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span><span>- R$ {Number(sale.discount_amount).toFixed(2).replace(".", ",")}</span></div>}
              {Number(sale.surcharge_amount) > 0 && <div className="flex justify-between text-orange-600"><span>Acréscimo</span><span>+ R$ {Number(sale.surcharge_amount).toFixed(2).replace(".", ",")}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>R$ {Number(sale.total_amount).toFixed(2).replace(".", ",")}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pagamentos</CardTitle></CardHeader>
            <CardContent>
              {!payments?.length ? <p className="text-muted-foreground text-center py-4">Nenhum pagamento</p> : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm border rounded-md px-3 py-2">
                      <div>
                        <span className="font-medium">{paymentMethodLabels[p.payment_method]}</span>
                        {p.reference && <span className="text-muted-foreground ml-2">· {p.reference}</span>}
                      </div>
                      <span className="font-medium">R$ {Number(p.amount).toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total pago</span>
                    <span>R$ {payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp Message History */}
          <MessageHistoryPanel referenceType="sale" referenceId={sale.id} />
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Venda</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação irá reverter o estoque e os lançamentos financeiros.</p>
          <Textarea placeholder="Motivo do cancelamento..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason || cancelSale.isPending}>Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={showReturn} onOpenChange={setShowReturn}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Devolução</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={returnItemId} onValueChange={setReturnItemId}>
              <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
              <SelectContent>
                {items?.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.product_name_snapshot} (qtd: {i.quantity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" min={1} max={selectedReturnItem?.quantity || 1} value={returnQty} onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)} placeholder="Quantidade" />
            <Textarea placeholder="Motivo da devolução..." value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturn(false)}>Voltar</Button>
            <Button onClick={handleReturn} disabled={!returnItemId || !returnReason || processReturn.isPending}>Confirmar Devolução</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={newPayMethod} onValueChange={(v) => setNewPayMethod(v as SalePaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(paymentMethodLabels) as [SalePaymentMethod, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" step="0.01" min={0} value={newPayAmount} onChange={(e) => setNewPayAmount(parseFloat(e.target.value) || 0)} placeholder="Valor" />
            <Input placeholder="Referência (opcional)" value={newPayRef} onChange={(e) => setNewPayRef(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Voltar</Button>
            <Button onClick={handleAddPayment} disabled={newPayAmount <= 0 || addPayment.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
