import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle,
  Users, Building2, FileText, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      const [teamPending, teamPaid, teamAll, cpPending, cpPaid, cpAll, topPartner, topTeam] = await Promise.all([
        db.from("commission_entries").select("commission_amount", { count: "exact" }).eq("status", "pending"),
        db.from("commission_entries").select("commission_amount", { count: "exact" }).eq("status", "paid"),
        db.from("commission_entries").select("id", { count: "exact", head: true }).gte("reference_date", monthStart).lte("reference_date", monthEnd),
        db.from("cp_commission_periods").select("commission_amount", { count: "exact" }).eq("status", "pending"),
        db.from("cp_commission_periods").select("commission_amount", { count: "exact" }).eq("status", "paid"),
        db.from("cp_commission_periods").select("id", { count: "exact", head: true }).gte("period_start", monthStart),
        db.from("cp_commission_periods").select("commission_amount, collection_points(name)").eq("status", "pending").order("commission_amount", { ascending: false }).limit(3),
        db.from("commission_entries").select("commission_amount, profiles!commission_entries_user_id_fkey(full_name)").eq("status", "pending").order("commission_amount", { ascending: false }).limit(3),
      ]);

      const sumField = (rows: any[] | null) => (rows || []).reduce((s: number, r: any) => s + (Number(r.commission_amount) || 0), 0);

      return {
        teamPendingTotal: sumField(teamPending.data),
        teamPendingCount: teamPending.count || 0,
        teamPaidTotal: sumField(teamPaid.data),
        teamPaidCount: teamPaid.count || 0,
        teamMonthCount: teamAll.count || 0,
        cpPendingTotal: sumField(cpPending.data),
        cpPendingCount: cpPending.count || 0,
        cpPaidTotal: sumField(cpPaid.data),
        cpPaidCount: cpPaid.count || 0,
        cpMonthCount: cpAll.count || 0,
        topPartners: (topPartner.data || []).map((r: any) => ({
          name: r.collection_points?.name || "—",
          amount: r.commission_amount,
        })),
        topTeam: (topTeam.data || []).map((r: any) => ({
          name: r.profiles?.full_name || "—",
          amount: r.commission_amount,
        })),
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const d = data!;
  const totalPending = d.teamPendingTotal + d.cpPendingTotal;
  const totalPaid = d.teamPaidTotal + d.cpPaidTotal;
  const totalAll = totalPending + totalPaid;
  const pendingCount = d.teamPendingCount + d.cpPendingCount;

  const kpis = [
    { label: "Total Comissões", value: fmt(totalAll), icon: DollarSign, color: "text-primary" },
    { label: "Pendentes", value: fmt(totalPending), sub: `${pendingCount} registros`, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
    { label: "Pagas", value: fmt(totalPaid), icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Registros no Mês", value: String(d.teamMonthCount + d.cpMonthCount), icon: FileText, color: "text-blue-600 dark:text-blue-400" },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-muted ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg font-bold truncate">{k.value}</p>
                {k.sub && <p className="text-xs text-muted-foreground">{k.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions + alerts */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => go("partners")}>
              <Building2 className="h-3.5 w-3.5 mr-1" /> Parceiros
            </Button>
            <Button size="sm" variant="outline" onClick={() => go("reports")}>
              <FileText className="h-3.5 w-3.5 mr-1" /> Relatórios
            </Button>
            <Button size="sm" variant="outline" onClick={() => go("team")}>
              <Users className="h-3.5 w-3.5 mr-1" /> Equipe
            </Button>
            <Button size="sm" variant="outline" onClick={() => go("partners")}>
              <Filter className="h-3.5 w-3.5 mr-1" /> Pendentes
            </Button>
            <Button size="sm" variant="outline" onClick={() => go("partners")}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pagas
            </Button>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-sm font-semibold">Atenção</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {d.cpPendingCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {d.cpPendingCount} parceiro(s) com comissão pendente
                </Badge>
              </div>
            )}
            {d.teamPendingCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  <Users className="h-3 w-3 mr-1" />
                  {d.teamPendingCount} comissão(ões) de equipe a liberar
                </Badge>
              </div>
            )}
            {pendingCount === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum alerta no momento ✓</p>
            )}

            {/* Top pending */}
            {d.topPartners.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">Maiores pendências (parceiros)</p>
                {d.topPartners.map((p: any, i: number) => (
                  <p key={i} className="text-xs truncate">{p.name} — <span className="font-medium">{fmt(p.amount)}</span></p>
                ))}
              </div>
            )}
            {d.topTeam.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">Maiores pendências (equipe)</p>
                {d.topTeam.map((p: any, i: number) => (
                  <p key={i} className="text-xs truncate">{p.name} — <span className="font-medium">{fmt(p.amount)}</span></p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
