import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData, useMonthlyTrend, DateRange } from "@/hooks/useDashboardData";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { OrdersByStatusChart } from "@/components/dashboard/OrdersByStatusChart";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { DeviceTypesChart } from "@/components/dashboard/DeviceTypesChart";
import { TechnicianProductivityChart } from "@/components/dashboard/TechnicianProductivityChart";
import { PartsConsumptionChart } from "@/components/dashboard/PartsConsumptionChart";
import { CollectionPointsChart } from "@/components/dashboard/CollectionPointsChart";
import { CommonDefectsChart } from "@/components/dashboard/CommonDefectsChart";
import LowStockAlert from "@/modules/inventory/components/LowStockAlert";

export default function Dashboard() {
  const [preset, setPreset] = useState("30d");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  });

  const { data: summary, isLoading } = useDashboardData(dateRange);

  // Quote approval rate
  const quoteApprovalRate = summary && summary.quotes_total > 0
    ? Math.round((summary.quotes_approved / summary.quotes_total) * 100)
    : null;

  // Warranty return rate
  const warrantyReturnRate = summary && summary.warranties_total > 0
    ? Math.round((summary.warranties_voided / summary.warranties_total) * 100)
    : null;

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

  // Transform RPC data for chart components
  const statusChartData = Object.entries(summary.orders_by_status).map(([status, count]) => ({ status, count }));
  const deviceTypesData = Object.entries(summary.device_types).map(([device_type]) => ({ device_type }));
  const techData = summary.technician_orders || [];
  const defectsData = (summary.top_defects || []).map(d => ({ probable_cause: d.cause }));
  const cpData = (summary.collection_point_orders || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão gerencial do sistema i9 Solution</p>
        </div>
        <DashboardFilters dateRange={dateRange} onDateRangeChange={setDateRange} preset={preset} onPresetChange={setPreset} />
      </div>

      <LowStockAlert />

      <KpiCards
        totalOrders={summary.total_orders}
        openOrders={summary.open_orders}
        avgTurnaroundHours={summary.avg_turnaround_hours ? Math.round(summary.avg_turnaround_hours) : null}
        quoteApprovalRate={quoteApprovalRate}
        totalRevenue={Number(summary.total_revenue)}
        totalExpenses={Number(summary.total_expenses)}
        profit={Number(summary.total_revenue) - Number(summary.total_expenses)}
        warrantyReturnRate={warrantyReturnRate}
        slaOverdueCount={summary.sla_overdue_count}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <OrdersByStatusChart data={statusChartData} />
        {summary.monthly_trend && <RevenueTrendChart data={summary.monthly_trend} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TechnicianProductivityChart data={techData} />
        <DeviceTypesChart data={deviceTypesData} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CommonDefectsChart data={summary.top_defects || []} />
        <CollectionPointsChart data={cpData} />
      </div>
    </div>
  );
}
