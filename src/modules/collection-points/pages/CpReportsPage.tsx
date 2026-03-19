import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCpPerformance, type CpPerformanceEntry } from "../hooks/useCpPerformance";
import { useAllCollectionPoints } from "../hooks/useCollectionPoints";
import { commissionTypeLabels, type CommissionType } from "../types";

function fmt(v: number) { return `R$ ${v.toFixed(2)}`; }

export default function CpReportsPage() {
  const [cpId, setCpId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: cps } = useAllCollectionPoints();
  const { data: rows, isLoading } = useCpPerformance(
    dateFrom || null,
    dateTo || null,
    cpId || null,
  );

  const exportCsv = () => {
    if (!rows?.length) return;
    const headers = ["Ponto de Coleta", "Total OS", "Concluídas", "Faturamento", "Ticket Médio", "Tipo Comissão", "Valor Comissão", "Comissão Calculada"];
    const lines = rows.map(r =>
      [r.cp_name, r.total_orders, r.completed_orders, r.total_revenue, r.avg_ticket, r.commission_type, r.commission_value, r.calculated_commission].join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-pontos-coleta-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = (rows || []).reduce(
    (acc, r) => ({
      orders: acc.orders + Number(r.total_orders),
      completed: acc.completed + Number(r.completed_orders),
      revenue: acc.revenue + Number(r.total_revenue),
      commission: acc.commission + Number(r.calculated_commission),
    }),
    { orders: 0, completed: 0, revenue: 0, commission: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Relatório de Pontos de Coleta</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows?.length}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-56">
          <label className="text-xs text-muted-foreground">Ponto de Coleta</label>
          <Select value={cpId} onValueChange={setCpId}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(cps || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Total OS</p>
            <p className="text-2xl font-bold">{totals.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Concluídas</p>
            <p className="text-2xl font-bold">{totals.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Faturamento</p>
            <p className="text-2xl font-bold">{fmt(totals.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Comissões</p>
            <p className="text-2xl font-bold">{fmt(totals.commission)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ponto de Coleta</TableHead>
              <TableHead className="text-right">Total OS</TableHead>
              <TableHead className="text-right">Concluídas</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
              <TableHead>Tipo Comissão</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows || []).map(r => (
              <TableRow key={r.cp_id}>
                <TableCell className="font-medium">{r.cp_name}</TableCell>
                <TableCell className="text-right">{r.total_orders}</TableCell>
                <TableCell className="text-right">{r.completed_orders}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.total_revenue))}</TableCell>
                <TableCell className="text-right">{fmt(Number(r.avg_ticket))}</TableCell>
                <TableCell>
                  <Badge variant="outline">{commissionTypeLabels[r.commission_type as CommissionType] || r.commission_type}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(r.calculated_commission))}</TableCell>
              </TableRow>
            ))}
            {!(rows || []).length && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum dado encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
