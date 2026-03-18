import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSales, useSalesDashboard } from "../hooks/useSales";
import { saleStatusLabels, saleStatusColors, paymentStatusLabels, SaleStatus, SalePaymentStatus } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import DataPagination from "@/components/ui/data-pagination";
import { Plus, Search, ShoppingBag, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SalesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<SalePaymentStatus | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [sellerFilter, setSellerFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSales(search, statusFilter, paymentFilter, dateFrom, dateTo, page);
  const items = data?.items || [];
  const total = data?.total || 0;

  // Period totals from dashboard summary
  const periodFrom = dateFrom || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const periodTo = dateTo || format(endOfMonth(new Date()), "yyyy-MM-dd");
  const { data: summary } = useSalesDashboard(periodFrom + "T00:00:00", periodTo + "T23:59:59");

  // Client-side seller name filter
  const filteredItems = sellerFilter
    ? items.filter((i) => i.seller_name?.toLowerCase().includes(sellerFilter.toLowerCase()))
    : items;

  const resetFilters = () => {
    setSearch(""); setStatusFilter(null); setPaymentFilter(null);
    setDateFrom(null); setDateTo(null); setSellerFilter(""); setPage(1);
  };

  const hasFilters = search || statusFilter || paymentFilter || dateFrom || dateTo || sellerFilter;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" /> Vendas
          </h1>
          <p className="text-muted-foreground">Vendas de balcão e internas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/sales/dashboard"><BarChart3 className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
          <Button asChild>
            <Link to="/sales/new"><Plus className="mr-2 h-4 w-4" /> Nova Venda</Link>
          </Button>
        </div>
      </div>

      {/* Quick summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="text-xl font-bold">{summary.total_sales || 0}</p>
                </div>
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                  <p className="text-xl font-bold">R$ {Number(summary.total_revenue || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</p>
                </div>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-xl font-bold">R$ {Number(summary.average_ticket || 0).toFixed(2).replace(".", ",")}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Devoluções</p>
                  <p className="text-xl font-bold">R$ {Number(summary.total_returns || 0).toFixed(2).replace(".", ",")}</p>
                </div>
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por número, observações..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Input placeholder="Filtrar por vendedor..." value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)} className="lg:w-[200px]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? null : v as SaleStatus); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {(Object.entries(saleStatusLabels) as [SaleStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter || "all"} onValueChange={(v) => { setPaymentFilter(v === "all" ? null : v as SalePaymentStatus); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Pagamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos pagamentos</SelectItem>
                  {(Object.entries(paymentStatusLabels) as [SalePaymentStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom || ""} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} className="w-[150px]" />
              <Input type="date" value={dateTo || ""} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} className="w-[150px]" />
              {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Limpar filtros</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !filteredItems.length ? (
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
                      <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((sale) => (
                      <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales/${sale.id}`)}>
                        <TableCell className="font-mono font-medium text-xs">{sale.sale_number}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{sale.customer_name || "Consumidor"}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{sale.seller_name || "—"}</TableCell>
                        <TableCell><Badge className={saleStatusColors[sale.status]}>{saleStatusLabels[sale.status]}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant="outline">{paymentStatusLabels[sale.payment_status]}</Badge></TableCell>
                        <TableCell className="text-right font-medium">R$ {Number(sale.total_amount).toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{format(new Date(sale.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
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
