import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Filter, Play, Check, Banknote, Eye } from "lucide-react";
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
import { useAllCollectionPoints } from "../hooks/useCollectionPoints";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePeriodOrders } from "../hooks/useCpCommissionPeriods";

const statusLabels: Record<string, string> = { pending: "Pendente", approved: "Aprovada", paid: "Paga" };
const statusVariant: Record<string, "secondary" | "default" | "outline"> = { pending: "secondary", approved: "outline", paid: "default" };

const statusColors: Record<string, string> = {
  received: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function CpCommissionPeriodsPage() {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
  const [cpFilter, setCpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState("pix");

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<any>(null);

  const { data: points } = useAllCollectionPoints();
  const { data, isLoading } = useCpCommissionPeriods(
    statusFilter !== "all" ? statusFilter : undefined,
    periodStart || undefined,
    periodEnd || undefined,
    page,
    cpFilter !== "all" ? cpFilter : undefined,
  );
  const { data: periodOrders, isLoading: loadingOrders } = usePeriodOrders(
    detailPeriod?.collection_point_id,
    detailPeriod?.period_start,
    detailPeriod?.period_end,
  );
  const generate = useGenerateCpCommissions();
  const approve = useApproveCpCommission();
  const pay = usePayCpCommission();

  const items = data?.items || [];
  const total = data?.total || 0;

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) return;
    generate.mutate({ periodStart, periodEnd, cpId: cpFilter !== "all" ? cpFilter : undefined });
  };

  const handlePay = () => {
    if (!payingId) return;
    pay.mutate({ id: payingId, method: payMethod }, {
      onSuccess: () => { setPayDialogOpen(false); setPayingId(null); },
    });
  };

  // Summary totals
  const totalCommission = items.reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalRevenue = items.reduce((s, c) => s + Number(c.total_revenue), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Fechamento de Comissões — Parceiros
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Selecione o período e o parceiro para gerar, aprovar e pagar comissões. Clique em "Detalhes" para ver as OS vinculadas.
      </p>

      {/* Filters + Generate */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs">Parceiro</Label>
            <Select value={cpFilter} onValueChange={(v) => { setCpFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Parceiros</SelectItem>
                {points?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Parceiros</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold">{items.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Total OS Concluídas</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold">{items.reduce((s, c) => s + c.completed_orders, 0)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Faturamento</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Comissão a Repassar</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-orange-600">R$ {totalCommission.toFixed(2)}</p></CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {isLoading ? <Skeleton className="h-64" /> : !items.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma comissão encontrada para o período selecionado.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">OS Concluídas</TableHead>
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
                    <TableCell className="text-right font-bold">R$ {Number(c.commission_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status] || "secondary"}>
                        {statusLabels[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setDetailPeriod(c); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> Detalhes
                        </Button>
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
                      </div>
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

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              OS do Parceiro — {detailPeriod?.collection_points?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {detailPeriod && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Período:</span>
                  <p className="font-medium">
                    {format(new Date(detailPeriod.period_start + "T00:00:00"), "dd/MM/yy", { locale: ptBR })} – {format(new Date(detailPeriod.period_end + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Comissão Total:</span>
                  <p className="font-bold text-lg text-orange-600">R$ {Number(detailPeriod.commission_amount).toFixed(2)}</p>
                </div>
              </div>
            )}

            {loadingOrders ? <Skeleton className="h-40" /> : !periodOrders?.length ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma OS encontrada neste período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodOrders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="text-sm">{o.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[o.status] || ""}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">R$ {Number(o.total_amount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
