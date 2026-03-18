import { useState } from "react";
import { useSalesDashboard } from "../hooks/useSales";
import { paymentMethodLabels, SalePaymentMethod } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, DollarSign, TrendingUp, RotateCcw } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
  "hsl(var(--accent))",
];

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

  // Chart data - top products
  const topProductsData = (pd.top_products || []).map((p: any) => ({
    name: p.name?.length > 15 ? p.name.substring(0, 15) + "…" : p.name,
    fullName: p.name,
    quantidade: Number(p.qty),
    receita: Number(p.revenue),
  }));

  // Chart data - sellers
  const sellersData = (pd.sales_by_seller || []).map((s: any) => ({
    name: s.name?.length > 12 ? s.name.substring(0, 12) + "…" : s.name,
    fullName: s.name,
    vendas: Number(s.count),
    receita: Number(s.revenue),
  }));

  // Chart data - payment methods
  const paymentData = pd.sales_by_payment_method
    ? Object.entries(pd.sales_by_payment_method as Record<string, number>).map(([method, count]) => ({
        name: paymentMethodLabels[method as SalePaymentMethod] || method,
        value: Number(count),
      }))
    : [];

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <CardContent><div className="text-2xl font-bold">{fmt(Number(td.total_revenue || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(Number(td.average_ticket || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Devoluções Hoje</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(Number(td.total_returns || 0))}</div></CardContent>
        </Card>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendas no Período</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{pd.total_sales || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(Number(pd.total_revenue || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(Number(pd.average_ticket || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Devoluções</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(Number(pd.total_returns || 0))}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Mais Vendidos (Quantidade)</CardTitle></CardHeader>
          <CardContent>
            {topProductsData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum dado no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProductsData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" width={110} className="text-xs" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name === "quantidade" ? "Quantidade" : "Receita"]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sellers Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por Vendedor (Receita)</CardTitle></CardHeader>
          <CardContent>
            {sellersData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum dado no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sellersData} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "Receita"]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }}
                  />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Pie Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Meios de Pagamento</CardTitle></CardHeader>
          <CardContent>
            {paymentData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum dado no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--card-foreground))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top products by revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base">Mais Vendidos (Receita)</CardTitle></CardHeader>
          <CardContent>
            {topProductsData.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum dado no período</p>
            ) : (
              <div className="space-y-3">
                {(pd.top_products as any[]).map((p: any, i: number) => {
                  const maxRev = Math.max(...(pd.top_products as any[]).map((x: any) => Number(x.revenue)));
                  const pct = maxRev > 0 ? (Number(p.revenue) / maxRev) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate max-w-[200px]">{p.name}</span>
                        <span className="text-muted-foreground font-medium">{p.qty}x · {fmt(Number(p.revenue))}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
