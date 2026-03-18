import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  useReceivablesPaginated,
  useReceivablesSummary,
  useRegisterReceivablePayment,
  useCancelReceivable,
  useCreateReceivable,
  useReceivablePayments,
} from "../hooks/useReceivables";
import {
  receivableStatusLabels,
  receivableStatusColors,
  referenceTypeLabels,
  paymentMethodLabels,
  type ReceivableStatus,
  type AccountReceivable,
} from "../types";
import { useAutoSendMessage } from "@/modules/messaging/hooks/useCustomerMessaging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import DataPagination from "@/components/ui/data-pagination";
import {
  DollarSign, Search, Plus, CreditCard, XCircle, MessageSquare,
  AlertTriangle, CheckCircle, Clock, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCompanyName } from "@/hooks/useCompanyName";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ReceivablesPage() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [payDialog, setPayDialog] = useState<AccountReceivable | null>(null);
  const [newDialog, setNewDialog] = useState(false);

  const filterStatus = status === "all" ? null : (status as ReceivableStatus);
  const { data, isLoading } = useReceivablesPaginated(filterStatus, search, false, page);
  const { data: summary } = useReceivablesSummary();
  const items = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> Contas a Receber
          </h1>
          <p className="text-muted-foreground">Controle de valores pendentes e recebimentos</p>
        </div>
        <Button onClick={() => setNewDialog(true)}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<DollarSign />} label="Total a Receber" value={formatCurrency(summary?.total_receivable ?? 0)} color="text-primary" />
        <SummaryCard icon={<AlertTriangle />} label="Vencidos" value={formatCurrency(summary?.total_overdue ?? 0)} sub={`${summary?.overdue_count ?? 0} contas`} color="text-destructive" />
        <SummaryCard icon={<CheckCircle />} label="Recebido no Mês" value={formatCurrency(summary?.received_month ?? 0)} color="text-green-600" />
        <SummaryCard icon={<Clock />} label="Em Aberto" value={`${summary?.open_count ?? 0}`} color="text-amber-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar descrição..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className={item.status === "overdue" ? "bg-destructive/5" : item.status === "paid" ? "bg-green-50 dark:bg-green-950/20" : ""}>
                  <TableCell className="font-medium">{item.customer_name || "—"}</TableCell>
                  <TableCell>
                    <div>{item.description}</div>
                    <div className="text-xs text-muted-foreground">{referenceTypeLabels[item.reference_type]}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.total_amount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.amount_received)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.remaining_amount)}</TableCell>
                  <TableCell>{item.due_date ? format(new Date(item.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell><Badge className={receivableStatusColors[item.status]}>{receivableStatusLabels[item.status]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.status !== "paid" && item.status !== "cancelled" && (
                        <Button size="sm" variant="outline" onClick={() => setPayDialog(item)}><CreditCard className="h-3 w-3 mr-1" /> Pagar</Button>
                      )}
                      {item.status !== "paid" && item.status !== "cancelled" && (
                        <WhatsAppChargeButton receivable={item} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && <DataPagination page={data.page} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}
        </CardContent>
      </Card>

      {payDialog && <PaymentDialog receivable={payDialog} onClose={() => setPayDialog(null)} />}
      {newDialog && <NewReceivableDialog onClose={() => setNewDialog(false)} />}
    </div>
  );
}

/* ── Summary Card ── */
function SummaryCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`${color} p-2 rounded-lg bg-muted`}>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Payment Dialog ── */
function PaymentDialog({ receivable, onClose }: { receivable: AccountReceivable; onClose: () => void }) {
  const [amount, setAmount] = useState(receivable.remaining_amount.toString());
  const [method, setMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const mutation = useRegisterReceivablePayment();
  const { data: payments } = useReceivablePayments(receivable.id);

  const handleSubmit = async () => {
    await mutation.mutateAsync({
      receivableId: receivable.id,
      amount: parseFloat(amount),
      paymentMethod: method,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
            <p><strong>Descrição:</strong> {receivable.description}</p>
            <p><strong>Total:</strong> {formatCurrency(receivable.total_amount)}</p>
            <p><strong>Restante:</strong> {formatCurrency(receivable.remaining_amount)}</p>
          </div>

          {payments && payments.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Pagamentos anteriores</Label>
              <div className="space-y-1 mt-1">
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                    <span>{format(new Date(p.paid_at), "dd/MM/yy HH:mm")}</span>
                    <span>{paymentMethodLabels[p.payment_method] || p.payment_method}</span>
                    <span className="font-mono">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !parseFloat(amount)}>
            {mutation.isPending ? "Processando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── New Receivable Dialog ── */
function NewReceivableDialog({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const createMutation = useCreateReceivable();

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      description,
      total_amount: parseFloat(totalAmount),
      due_date: dueDate || null,
      reference_type: "manual",
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Total</Label>
              <Input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || !description || !parseFloat(totalAmount)}>
            {createMutation.isPending ? "Criando..." : "Criar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── WhatsApp Charge Button ── */
function WhatsAppChargeButton({ receivable }: { receivable: AccountReceivable }) {
  const autoSend = useAutoSendMessage();
  const companyName = useCompanyName("i9 Solutions");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!receivable.customer_id) return;
    setSending(true);
    try {
      // Need phone — fetch customer
      const { data: customer } = await (supabase as any).from("customers").select("whatsapp, phone").eq("id", receivable.customer_id).single();
      const phone = customer?.whatsapp || customer?.phone;
      if (!phone) return;

      const message = `Olá ${receivable.customer_name || "Cliente"},\n\nInformamos que existe um valor pendente:\n\n📋 *${receivable.description}*\n💰 Valor: *${formatCurrency(receivable.remaining_amount)}*\n📅 Vencimento: *${receivable.due_date ? format(new Date(receivable.due_date), "dd/MM/yyyy") : "A combinar"}*\n\nPara mais informações, entre em contato.\n\nAtenciosamente,\n${companyName}`;

      await autoSend({
        customerId: receivable.customer_id,
        phone,
        eventType: "receivable_charge",
        referenceType: "receivable",
        referenceId: receivable.id,
        templateKey: "receivable_charge",
        variables: {
          customer_name: receivable.customer_name || "Cliente",
          description: receivable.description,
          remaining_amount: formatCurrency(receivable.remaining_amount),
          due_date: receivable.due_date ? format(new Date(receivable.due_date), "dd/MM/yyyy") : "A combinar",
        },
      });
    } catch {
      // handled
    } finally {
      setSending(false);
    }
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleSend} disabled={!receivable.customer_id || sending} title={!receivable.customer_id ? "Sem cliente vinculado" : "Enviar cobrança via WhatsApp"}>
      <MessageSquare className="h-3 w-3" />
    </Button>
  );
}
