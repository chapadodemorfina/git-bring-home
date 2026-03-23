import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList, Plus, ScanLine, ListChecks, ShieldCheck,
  AlertTriangle, Clock, CheckCircle, Wrench, Stethoscope,
  PackageCheck, Search,
} from "lucide-react";
import { useState } from "react";

const db = supabase as any;

interface OperationMetrics {
  total_open: number;
  in_diagnosis: number;
  awaiting_approval: number;
  in_execution: number;
  ready_for_pickup: number;
  overdue: number;
  awaiting_parts: number;
}

const defaultMetrics: OperationMetrics = {
  total_open: 0,
  in_diagnosis: 0,
  awaiting_approval: 0,
  in_execution: 0,
  ready_for_pickup: 0,
  overdue: 0,
  awaiting_parts: 0,
};

function useOperationMetrics() {
  return useQuery<OperationMetrics>({
    queryKey: ["operation-metrics"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_orders")
        .select("status, priority, updated_at")
        .not("status", "in", '("delivered","cancelled")');

      if (error) throw error;
      const rows = (data || []) as { status: string; priority: string; updated_at: string }[];

      const now = Date.now();
      let overdue = 0;
      const counts: Record<string, number> = {};

      rows.forEach((r) => {
        counts[r.status] = (counts[r.status] || 0) + 1;
        // Simple overdue heuristic: >72h in same status
        const hoursInStatus = (now - new Date(r.updated_at).getTime()) / 3600000;
        if (hoursInStatus > 72 && !["received", "ready_for_pickup"].includes(r.status)) {
          overdue++;
        }
      });

      return {
        total_open: rows.length,
        in_diagnosis: (counts["awaiting_diagnosis"] || 0) + (counts["triage"] || 0),
        awaiting_approval: (counts["awaiting_customer_approval"] || 0) + (counts["awaiting_quote"] || 0),
        in_execution: (counts["in_repair"] || 0) + (counts["in_testing"] || 0),
        ready_for_pickup: counts["ready_for_pickup"] || 0,
        overdue,
        awaiting_parts: counts["awaiting_parts"] || 0,
      };
    },
  });
}

export function OperationDashboard() {
  const { data: metrics, isLoading } = useOperationMetrics();
  const m = metrics || defaultMetrics;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSearch = (v: string) => {
    setSearch(v);
    if (v.trim()) {
      navigate(`/operation?tab=orders`);
    }
  };

  const kpis = [
    { label: "Abertas", value: m.total_open, icon: ClipboardList, color: "text-primary" },
    { label: "Diagnóstico", value: m.in_diagnosis, icon: Stethoscope, color: "text-chart-3" },
    { label: "Aguard. Aprovação", value: m.awaiting_approval, icon: Clock, color: "text-chart-5" },
    { label: "Em Execução", value: m.in_execution, icon: Wrench, color: "text-chart-1" },
    { label: "Pronta Entrega", value: m.ready_for_pickup, icon: PackageCheck, color: "text-chart-2" },
    { label: "Atrasadas", value: m.overdue, icon: AlertTriangle, color: m.overdue > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  const shortcuts = [
    { label: "Nova OS", icon: Plus, onClick: () => navigate("/service-orders/new"), variant: "default" as const },
    { label: "Escanear OS", icon: ScanLine, onClick: () => navigate("/operation?tab=scan"), variant: "outline" as const },
    { label: "Filas de Trabalho", icon: ListChecks, onClick: () => navigate("/operation?tab=queues"), variant: "outline" as const },
    { label: "Garantias", icon: ShieldCheck, onClick: () => navigate("/operation?tab=warranties"), variant: "outline" as const },
  ];

  const alerts = [
    m.ready_for_pickup > 0 && { label: `${m.ready_for_pickup} OS pronta(s) para retirada`, color: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
    m.overdue > 0 && { label: `${m.overdue} OS atrasada(s) (>72h sem avanço)`, color: "bg-destructive/10 text-destructive border-destructive/20" },
    m.awaiting_parts > 0 && { label: `${m.awaiting_parts} OS aguardando peças`, color: "bg-chart-5/10 text-chart-5 border-chart-5/20" },
    m.awaiting_approval > 0 && { label: `${m.awaiting_approval} OS aguardando aprovação do cliente`, color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2 px-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-10" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold">{kpi.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <Button key={s.label} variant={s.variant} size="sm" onClick={s.onClick} className="gap-1.5">
              <s.icon className="h-4 w-4" />
              {s.label}
            </Button>
          ))}
        </div>
        <div className="sm:ml-auto w-full sm:w-64">
          <SearchInput value={search} onSearch={handleSearch} placeholder="Buscar OS..." />
        </div>
      </div>

      {/* Attention Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Badge key={a.label} variant="outline" className={`${a.color} text-xs py-1 px-2.5 font-medium`}>
              {a.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
