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
import LowStockAlert from "@/modules/inventory/components/LowStockAlert";
import { useCompanyName } from "@/hooks/useCompanyName";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          {companyName && <p className="text-muted-foreground">Inteligência operacional — {companyName}</p>}
        </div>
        <DashboardFilters dateRange={dateRange} onDateRangeChange={setDateRange} preset={preset} onPresetChange={setPreset} />
      </div>

      <LowStockAlert />

      <KpiCards
        totalOrders={summary.total_orders}
        openOrders={summary.open_orders}
        avgTurnaroundHours={summary.avg_turnaround_hours ? Math.round(summary.avg_turnaround_hours) : null}
        quoteApprovalRate={quoteApprovalRate}
        totalRevenue={Number(summary.total_revenue) || 0}
        totalExpenses={Number(summary.total_expenses) || 0}
        profit={(Number(summary.total_revenue) || 0) - (Number(summary.total_expenses) || 0)}
        warrantyReturnRate={warrantyReturnRate}
        slaOverdueCount={summary.sla_overdue_count}
        todayReceived={summary.today_received}
        todayDelivered={summary.today_delivered}
        todayRevenue={Number(summary.today_revenue) || 0}
        todayQuotes={summary.today_quotes}
        avgDiagnosisHours={summary.avg_diagnosis_hours}
        avgTicketValue={summary.avg_ticket_value ? Number(summary.avg_ticket_value) : null}
        totalCommissions={Number(summary.total_commissions) || 0}
        stockValue={Number(summary.stock_value) || 0}
        lowStockCount={summary.low_stock_count}
      />

      {/* Pipeline */}
      <PipelineView data={summary.pipeline || {}} />

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <OrdersByStatusChart data={statusChartData} />
        <RevenueTrendChart data={summary.monthly_trend || []} />
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TechnicianProductivityChart data={techData} />
        <DeviceTypesChart data={Object.entries(summary.device_types || {}).map(([device_type, count]) => ({ device_type, count }))} />
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CommonDefectsChart data={summary.top_defects || []} />
        <CollectionPointsChart data={cpData} />
      </div>

      {/* Parts consumption */}
      <PartsConsumptionChart data={summary.top_parts || []} />
    </div>
  );
}
