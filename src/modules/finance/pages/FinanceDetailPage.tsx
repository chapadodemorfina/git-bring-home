import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useFinancialEntry, usePayments, useDeleteFinancialEntry, useUpdateFinancialEntry } from "../hooks/useFinance";
import {
  entryTypeLabels, entryTypeColors, statusLabels, statusColors,
  paymentMethodLabels,
} from "../types";
import PaymentDialog from "../components/PaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, CreditCard, Ban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useFinancialEntry(id);
  const { data: payments } = usePayments(id);
  const deleteMutation = useDeleteFinancialEntry();
  const updateMutation = useUpdateFinancialEntry();
  const [payOpen, setPayOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate("/finance");
  };

  const handleCancel = async () => {
    if (!id) return;
    await updateMutation.mutateAsync({ id, data: { status: "cancelled" } as any });
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!entry) return <p className="text-center py-12 text-muted-foreground">Lançamento não encontrado.</p>;

  const remaining = Number(entry.amount) - Number(entry.paid_amount);
  const canPay = entry.status !== "paid" && entry.status !== "cancelled";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" asChild><Link to="/finance"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <h1 className="text-2xl font-bold">{entry.description}</h1>
            <Badge className={entryTypeColors[entry.entry_type]}>{entryTypeLabels[entry.entry_type]}</Badge>
            <Badge className={statusColors[entry.status]}>{statusLabels[entry.status]}</Badge>
          </div>
          <p className="text-muted-foreground ml-12">
            Criado em {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            {entry.order_number && <> · OS: <Link to={`/service-orders/${entry.service_order_id}`} className="hover:underline">{entry.order_number}</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPay && (
            <Button onClick={() => setPayOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" /> Registrar Pagamento
            </Button>
          )}
          {entry.status !== "cancelled" && entry.status !== "paid" && (
            <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
              <Ban className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/finance/${entry.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Editar</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold font-mono">R$ {Number(entry.amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Pago</p>
                <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">R$ {Number(entry.paid_amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Restante</p>
                <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">R$ {remaining.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entry.category && (
                <div><p className="text-xs text-muted-foreground">Categoria</p><p className="font-medium">{entry.category}</p></div>
              )}
              {entry.due_date && (
                <div><p className="text-xs text-muted-foreground">Vencimento</p><p className="font-medium">{format(new Date(entry.due_date), "dd/MM/yyyy", { locale: ptBR })}</p></div>
              )}
              {entry.customer_name && (
                <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{entry.customer_name}</p></div>
              )}
              {entry.supplier_name && (
                <div><p className="text-xs text-muted-foreground">Fornecedor</p><p className="font-medium">{entry.supplier_name}</p></div>
              )}
              {entry.notes && (
                <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm">{entry.notes}</p></div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payments sidebar */}
        <div>
          <Card>
            <CardHeader><CardTitle>Pagamentos</CardTitle></CardHeader>
            <CardContent>
              {!payments?.length ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-medium">R$ {Number(p.amount).toFixed(2)}</span>
                        <Badge variant="outline">{paymentMethodLabels[p.payment_method]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(p.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      {p.reference && <p className="text-xs text-muted-foreground">Ref: {p.reference}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        entryId={entry.id}
        remainingAmount={remaining}
        payments={payments || []}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
    </div>
  );
}
