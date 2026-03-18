import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData, DateRange } from "@/hooks/useDashboardData";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { PipelineView } from "@/components/dashboard/PipelineView";
import { OrdersByStatusChart } from "@/components/dashboard/OrdersByStatusChart";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { DeviceTypesChart } from "@/components/dashboard/DeviceTypesChart";
import { TechnicianProductivityChart } from "@/components/dashboard/TechnicianProductivityChart";
import { PartsConsumptionChart } from "@/components/dashboard/PartsConsumptionChart";
import { CollectionPointsChart } from "@/components/dashboard/CollectionPointsChart";
import { CommonDefectsChart } from "@/components/dashboard/CommonDefectsChart";
import { SlaComplianceChart } from "@/components/dashboard/SlaComplianceChart";
import { QuoteConversionChart } from "@/components/dashboard/QuoteConversionChart";
import { OrdersTrendChart } from "@/components/dashboard/OrdersTrendChart";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { TeamRankingTable } from "@/components/dashboard/TeamRankingTable";
import LowStockAlert from "@/modules/inventory/components/LowStockAlert";
import { useCompanyName } from "@/hooks/useCompanyName";
import { AlertTriangle, DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, ShoppingBag, Wrench, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Dashboard() {
  const [preset, setPreset] = useState("30d");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  });

  const { data: summary, isLoading, error } = useDashboardData(dateRange);
  const companyName = useCompanyName();

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium">Erro ao carregar dashboard: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  const quoteApprovalRate = summary.quotes_total > 0
    ? Math.round((summary.quotes_approved / summary.quotes_total) * 100)
    : null;

  const warrantyReturnRate = summary.warranties_total > 0
    ? Math.round((summary.warranties_voided / summary.warranties_total) * 100)
    : null;

  const statusChartData = Object.entries(summary.orders_by_status || {}).map(([status, count]) => ({ status, count }));
  const techData = summary.technician_orders || [];
  const cpData = summary.collection_point_orders || [];
  const profit = Number(summary.total_revenue) - Number(summary.total_expenses) - Number(summary.total_commissions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Gerencial</h1>
          {companyName && <p className="text-muted-foreground">Visão estratégica — {companyName}</p>}
        </div>
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
          summary={summary}
          companyName={companyName || "i9 Solutions"}
        />
      </div>

      <LowStockAlert />

      {/* ══════ FINANCIAL SUMMARY STRIP ══════ */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <FinanceCard icon={<DollarSign className="h-4 w-4" />} label="Faturamento Hoje" value={fmt(Number(summary.today_sales_revenue) + Number(summary.today_revenue))} color="text-primary" />
        <FinanceCard icon={<TrendingUp className="h-4 w-4" />} label="Faturamento Mês" value={fmt(Number(summary.total_revenue))} color="text-chart-2" />
        <FinanceCard icon={<CreditCard className="h-4 w-4" />} label="Contas a Receber" value={fmt(Number(summary.receivables_total))} sub={summary.receivables_overdue > 0 ? `${fmt(Number(summary.receivables_overdue))} vencido` : undefined} color="text-amber-600" />
        <FinanceCard icon={<TrendingDown className="h-4 w-4" />} label="Contas a Pagar" value={fmt(Number(summary.payables_total))} color="text-destructive" />
        <FinanceCard icon={<Wallet className="h-4 w-4" />} label="Saldo de Caixa" value={fmt(Number(summary.cash_balance))} color="text-chart-1" />
        <FinanceCard icon={<BarChart3 className="h-4 w-4" />} label="Lucro Estimado" value={fmt(profit)} color={profit >= 0 ? "text-chart-2" : "text-destructive"} />
      </div>

      {/* ══════ INDICATORS STRIP ══════ */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <IndicatorCard label="Ticket Médio Vendas" value={fmt(Number(summary.sales_avg_ticket))} icon={<ShoppingBag className="h-3.5 w-3.5" />} />
        <IndicatorCard label="Vendas no Período" value={String(summary.sales_count)} icon={<ShoppingBag className="h-3.5 w-3.5" />} />
        <IndicatorCard label="Serviços Concluídos" value={String(summary.services_completed)} icon={<Wrench className="h-3.5 w-3.5" />} />
        <IndicatorCard label="Taxa Conversão OS" value={`${Number(summary.os_conversion_rate)}%`} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <IndicatorCard label="Ticket Médio OS" value={summary.avg_ticket_value != null ? fmt(Number(summary.avg_ticket_value)) : "—"} icon={<Wrench className="h-3.5 w-3.5" />} />
      </div>

      {/* ══════ TABS: Visão Geral / Vendas / Operacional ══════ */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas & Produtos</TabsTrigger>
          <TabsTrigger value="operations">Operacional</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="space-y-4">
          {/* Today cards */}
          <KpiCards
            totalOrders={summary.total_orders}
            openOrders={summary.open_orders}
            avgTurnaroundHours={summary.avg_turnaround_hours ? Math.round(summary.avg_turnaround_hours) : null}
            quoteApprovalRate={quoteApprovalRate}
            totalRevenue={Number(summary.total_revenue)}
            totalExpenses={Number(summary.total_expenses)}
            profit={profit}
            warrantyReturnRate={warrantyReturnRate}
            slaOverdueCount={summary.sla_overdue_count}
            todayReceived={summary.today_received}
            todayDelivered={summary.today_delivered}
            todayRevenue={Number(summary.today_revenue)}
            todayQuotes={summary.today_quotes}
            avgDiagnosisHours={summary.avg_diagnosis_hours}
            avgTicketValue={summary.avg_ticket_value ? Number(summary.avg_ticket_value) : null}
            totalCommissions={Number(summary.total_commissions)}
            stockValue={Number(summary.stock_value)}
            lowStockCount={summary.low_stock_count}
          />

          <PipelineView data={summary.pipeline || {}} />

          <div className="grid gap-4 lg:grid-cols-3">
            <SlaComplianceChart totalOrders={summary.total_orders} slaOverdueCount={summary.sla_overdue_count} />
            <QuoteConversionChart total={summary.quotes_total} approved={summary.quotes_approved} rejected={summary.quotes_rejected} />
            <OrdersTrendChart data={summary.monthly_trend || []} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RevenueTrendChart data={summary.monthly_trend || []} />
            <TeamRankingTable data={summary.team_ranking} />
          </div>
        </TabsContent>

        {/* ── SALES TAB ── */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PaymentMethodsChart data={summary.sales_by_payment_method} />
            <TopProductsChart data={summary.top_products_sold} />
          </div>
          <TeamRankingTable data={summary.team_ranking} />
        </TabsContent>

        {/* ── OPERATIONS TAB ── */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <OrdersByStatusChart data={statusChartData} />
            <TechnicianProductivityChart data={techData} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <DeviceTypesChart data={Object.entries(summary.device_types || {}).map(([device_type, count]) => ({ device_type, count }))} />
            <CommonDefectsChart data={summary.top_defects || []} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CollectionPointsChart data={cpData} />
            <PartsConsumptionChart data={summary.top_parts || []} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Finance Card ── */
function FinanceCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: `hsl(var(--primary))` }}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={color}>{icon}</span>
          <span className="text-[11px] font-medium text-muted-foreground truncate">{label}</span>
        </div>
        <p className="text-lg font-bold truncate">{value}</p>
        {sub && <p className="text-[10px] text-destructive font-medium">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Indicator Card ── */
function IndicatorCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
