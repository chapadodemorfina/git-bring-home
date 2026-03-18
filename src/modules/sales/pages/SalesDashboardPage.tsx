import { useState, useMemo } from "react";
import { useSalesDashboard } from "../hooks/useSales";
import { paymentMethodLabels, SalePaymentMethod } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, DollarSign, TrendingUp, RotateCcw } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export default function SalesDashboardPage() {
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const todayStart = format(startOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");
  const todayEnd = format(endOfDay(today), "yyyy-MM-dd'T'HH:mm:ss");

  const { data: periodData, isLoading: periodLoading } = useSalesDashboard(from + "T00:00:00", to + "T23:59:59");
  const { data: todayData, isLoading: todayLoading } = useSalesDashboard(todayStart, todayEnd);

  const isLoading = periodLoading || todayLoading;

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const td = todayData || {};
  const pd = periodData || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Dashboard de Vendas</h2>
          <p className="text-muted-foreground text-sm">Resumo do desempenho</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Today cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Hoje</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{td.total_sales || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {Number(td.total_revenue || 0).toFixed(2).replace(".", ",")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {Number(td.average_ticket || 0).toFixed(2).replace(".", ",")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devoluções Hoje</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {Number(td.total_returns || 0).toFixed(2).replace(".", ",")}</div></CardContent>
        </Card>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendas no Período</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{pd.total_sales || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faturamento no Período</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {Number(pd.total_revenue || 0).toFixed(2).replace(".", ",")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {Number(pd.average_ticket || 0).toFixed(2).replace(".", ",")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Devoluções</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {Number(pd.total_returns || 0).toFixed(2).replace(".", ",")}</div></CardContent>
        </Card>
      </div>

      {/* Top products + Sellers + Payment methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Mais Vendidos</CardTitle></CardHeader>
          <CardContent>
            {(pd.top_products || []).length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {(pd.top_products as any[]).map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground">{p.qty}x · R$ {Number(p.revenue).toFixed(2).replace(".", ",")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por Vendedor</CardTitle></CardHeader>
          <CardContent>
            {(pd.sales_by_seller || []).length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {(pd.sales_by_seller as any[]).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="text-muted-foreground">{s.count} vendas · R$ {Number(s.revenue).toFixed(2).replace(".", ",")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Meios de Pagamento</CardTitle></CardHeader>
          <CardContent>
            {!pd.sales_by_payment_method || Object.keys(pd.sales_by_payment_method).length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(pd.sales_by_payment_method as Record<string, number>).map(([method, count]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span>{paymentMethodLabels[method as SalePaymentMethod] || method}</span>
                    <span className="text-muted-foreground">{count}x</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
