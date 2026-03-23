import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle,
  Users, Building2, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const db = supabase as any;

function useCommissionsHubSummary() {
  return useQuery({
    queryKey: ["commissions-hub-summary"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const [teamPending, teamPaid, teamAll, cpPending, cpPaid, cpAll] = await Promise.all([
        db.from("commission_entries").select("commission_amount", { count: "exact" }).eq("status", "pending"),
        db.from("commission_entries").select("commission_amount", { count: "exact" }).eq("status", "paid"),
        db.from("commission_entries").select("id", { count: "exact", head: true }).gte("reference_date", monthStart).lte("reference_date", monthEnd),
        db.from("cp_commission_periods").select("commission_amount", { count: "exact" }).eq("status", "pending"),
        db.from("cp_commission_periods").select("commission_amount", { count: "exact" }).eq("status", "paid"),
        db.from("cp_commission_periods").select("id", { count: "exact", head: true }).gte("period_start", monthStart),
      ]);
      const sumField = (rows: any[] | null) => (rows || []).reduce((s: number, r: any) => s + (Number(r.commission_amount) || 0), 0);
      return {
        teamPendingTotal: sumField(teamPending.data),
        teamPendingCount: teamPending.count || 0,
        teamPaidTotal: sumField(teamPaid.data),
        cpPendingTotal: sumField(cpPending.data),
        cpPendingCount: cpPending.count || 0,
        cpPaidTotal: sumField(cpPaid.data),
        monthCount: (teamAll.count || 0) + (cpAll.count || 0),
      };
    },
  });
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CommissionsHubDashboard() {
  const { data, isLoading } = useCommissionsHubSummary();
  const [, setParams] = useSearchParams();
  const go = (tab: string) => setParams({ tab }, { replace: true });

  const d = data || { teamPendingTotal: 0, teamPendingCount: 0, teamPaidTotal: 0, cpPendingTotal: 0, cpPendingCount: 0, cpPaidTotal: 0, monthCount: 0 };
  const totalPending = d.teamPendingTotal + d.cpPendingTotal;
  const totalPaid = d.teamPaidTotal + d.cpPaidTotal;
  const totalAll = totalPending + totalPaid;
  const pendingCount = d.teamPendingCount + d.cpPendingCount;

  const kpis = [
    { label: "Total Comissões", value: fmt(totalAll), icon: DollarSign, color: "text-primary" },
    { label: "Pendentes", value: fmt(totalPending), icon: Clock, color: "text-chart-5", sub: `${pendingCount} registros` },
    { label: "Pagas", value: fmt(totalPaid), icon: CheckCircle2, color: "text-chart-2" },
    { label: "Registros no Mês", value: String(d.monthCount), icon: FileText, color: "text-chart-1" },
  ];

  const shortcuts = [
    { label: "Parceiros", icon: Building2, onClick: () => go("partners") },
    { label: "Relatórios", icon: FileText, onClick: () => go("reports") },
    { label: "Equipe", icon: Users, onClick: () => go("team") },
  ];

  const alerts: { label: string; color: string }[] = [];
  if (d.cpPendingCount > 0) alerts.push({ label: `${d.cpPendingCount} parceiro(s) com comissão pendente`, color: "bg-chart-5/10 text-chart-5 border-chart-5/20" });
  if (d.teamPendingCount > 0) alerts.push({ label: `${d.teamPendingCount} comissão(ões) de equipe a liberar`, color: "bg-chart-1/10 text-chart-1 border-chart-1/20" });

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2 px-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold">{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Button key={s.label} variant="outline" size="sm" onClick={s.onClick} className="gap-1.5">
            <s.icon className="h-4 w-4" />
            {s.label}
          </Button>
        ))}
      </div>

      {/* Attention Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Badge key={a.label} variant="outline" className={`${a.color} text-xs py-1 px-2.5 font-medium`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {a.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
