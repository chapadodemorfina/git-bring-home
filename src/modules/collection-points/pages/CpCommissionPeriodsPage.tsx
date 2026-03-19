import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Filter, Play, Check, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import DataPagination from "@/components/ui/data-pagination";
import {
  useCpCommissionPeriods,
  useGenerateCpCommissions,
  useApproveCpCommission,
  usePayCpCommission,
} from "../hooks/useCpCommissionPeriods";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const statusLabels: Record<string, string> = { pending: "Pendente", approved: "Aprovada", paid: "Paga" };
const statusVariant: Record<string, "secondary" | "default" | "outline"> = { pending: "secondary", approved: "outline", paid: "default" };

export default function CpCommissionPeriodsPage() {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("pix");

  const { data, isLoading } = useCpCommissionPeriods(
    statusFilter !== "all" ? statusFilter : undefined,
    periodStart || undefined,
    periodEnd || undefined,
    page
  );
  const generate = useGenerateCpCommissions();
  const approve = useApproveCpCommission();
  const pay = usePayCpCommission();

  const items = data?.items || [];
  const total = data?.total || 0;

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) return;
    generate.mutate({ periodStart, periodEnd });
  };

  const handlePay = () => {
    if (!payingId) return;
    pay.mutate({ id: payingId, method: payMethod }, {
      onSuccess: () => { setPayDialogOpen(false); setPayingId(null); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Comissões por Período
        </h1>
      </div>

      {/* Filters + Generate */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setPage(1); }} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setPage(1); }} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generate.isPending || !periodStart || !periodEnd}>
            <Play className="h-4 w-4 mr-1" /> Gerar Comissões
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? <Skeleton className="h-64" /> : !items.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma comissão encontrada.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">OS</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.collection_points?.name}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(c.period_start + "T00:00:00"), "dd/MM/yy", { locale: ptBR })} – {format(new Date(c.period_end + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">{c.completed_orders}</TableCell>
                    <TableCell className="text-right">R$ {Number(c.total_revenue).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">R$ {Number(c.commission_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status] || "secondary"}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {c.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => approve.mutate(c.id)} disabled={approve.isPending}>
                          <Check className="h-4 w-4 mr-1" /> Aprovar
                        </Button>
                      )}
                      {c.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => { setPayingId(c.id); setPayDialogOpen(true); }} disabled={pay.isPending}>
                          <Banknote className="h-4 w-4 mr-1" /> Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4">
              <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagar Comissão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Método de Pagamento</Label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="bank_transfer">Transferência</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={pay.isPending}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
