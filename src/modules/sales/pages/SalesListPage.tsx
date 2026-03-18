import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSales } from "../hooks/useSales";
import { saleStatusLabels, saleStatusColors, paymentStatusLabels, SaleStatus, SalePaymentStatus } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import DataPagination from "@/components/ui/data-pagination";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SalesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<SalePaymentStatus | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSales(search, statusFilter, paymentFilter, dateFrom, dateTo, page);
  const items = data?.items || [];
  const total = data?.total || 0;

  const periodTotal = items.reduce((s, i) => s + (i.status !== "cancelled" ? Number(i.total_amount) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" /> Vendas
          </h1>
          <p className="text-muted-foreground">Vendas de balcão e internas</p>
        </div>
        <Button asChild>
          <Link to="/sales/new"><Plus className="mr-2 h-4 w-4" /> Nova Venda</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, observações..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? null : v as SaleStatus); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {(Object.entries(saleStatusLabels) as [SaleStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter || "all"} onValueChange={(v) => { setPaymentFilter(v === "all" ? null : v as SalePaymentStatus); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pagamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos pagamentos</SelectItem>
                {(Object.entries(paymentStatusLabels) as [SalePaymentStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom || ""} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} className="w-[160px]" placeholder="De" />
            <Input type="date" value={dateTo || ""} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} className="w-[160px]" placeholder="Até" />
          </div>
          {total > 0 && (
            <div className="pt-2 text-sm text-muted-foreground">
              Total do período (na página): <span className="font-semibold text-foreground">R$ {periodTotal.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !items.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <ShoppingBag className="h-12 w-12" />
              <p>Nenhuma venda encontrada</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((sale) => (
                      <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales/${sale.id}`)}>
                        <TableCell className="font-mono font-medium">{sale.sale_number}</TableCell>
                        <TableCell>{sale.customer_name || "Consumidor"}</TableCell>
                        <TableCell>{sale.seller_name || "—"}</TableCell>
                        <TableCell><Badge className={saleStatusColors[sale.status]}>{saleStatusLabels[sale.status]}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{paymentStatusLabels[sale.payment_status]}</Badge></TableCell>
                        <TableCell className="text-right font-medium">R$ {Number(sale.total_amount).toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(sale.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
