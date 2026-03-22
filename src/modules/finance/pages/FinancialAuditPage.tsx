import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, FileWarning, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const db = supabase as any;

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const issueLabels: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  critical_divergence: {
    label: "Divergência Crítica",
    icon: <ShieldAlert className="h-4 w-4" />,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  cancelled_with_active_revenue: {
    label: "OS Cancelada c/ Receita Ativa",
    icon: <AlertTriangle className="h-4 w-4" />,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  missing_primary_revenue: {
    label: "Sem Receita Principal",
    icon: <FileWarning className="h-4 w-4" />,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  divergence: {
    label: "Divergência",
    icon: <AlertTriangle className="h-4 w-4" />,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  has_auxiliaries: {
    label: "Receitas Auxiliares",
    icon: <FileWarning className="h-4 w-4" />,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
};

export default function FinancialAuditPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: issues, isLoading } = useQuery({
    queryKey: ["financial-audit"],
    queryFn: async () => {
      const { data, error } = await db.rpc("audit_os_financial_inconsistencies");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (soId: string) => {
      const { error } = await db.rpc("upsert_os_revenue", { _service_order_id: soId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-audit"] });
      toast({ title: "Receita sincronizada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (soId: string) => {
      const { error } = await db.rpc("cancel_os_revenue", { _service_order_id: soId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-audit"] });
      toast({ title: "Receita cancelada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (issues || []).filter((i: any) => filter === "all" || i.issue_type === filter);

  const counts = (issues || []).reduce((acc: Record<string, number>, i: any) => {
    acc[i.issue_type] = (acc[i.issue_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria Financeira de OS</h1>
        <p className="text-muted-foreground text-sm">Inconsistências entre Ordens de Serviço e lançamentos financeiros</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(issueLabels).map(([key, cfg]) => (
          <Card key={key} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setFilter(key)}>
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-1.5 mb-1">
                {cfg.icon}
                <span className="text-xs font-medium truncate">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono">{counts[key] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({issues?.length || 0})</SelectItem>
            {Object.entries(issueLabels).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label} ({counts[key] || 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["financial-audit"] })}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : !filtered.length ? (
            <div className="text-center py-12">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600 mb-2" />
              <p className="text-muted-foreground font-medium">Nenhuma inconsistência encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status OS</TableHead>
                    <TableHead className="text-right">Total OS</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Divergência</TableHead>
                    <TableHead>Problema</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row: any) => {
                    const cfg = issueLabels[row.issue_type] || issueLabels.divergence;
                    const canSync = row.issue_type === "divergence" || row.issue_type === "missing_primary_revenue";
                    const canCancel = row.issue_type === "cancelled_with_active_revenue";
                    return (
                      <TableRow key={row.service_order_id}>
                        <TableCell>
                          <Link to={`/service-orders/${row.service_order_id}`} className="text-primary font-mono font-medium hover:underline">
                            {row.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="truncate max-w-[150px]">{row.customer_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{row.os_status}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(Number(row.os_total))}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.primary_revenue_id ? formatBRL(Number(row.primary_revenue_amount)) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.divergence && Math.abs(Number(row.divergence)) > 0.01
                            ? <span className="text-destructive">{formatBRL(Number(row.divergence))}</span>
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cfg.className} variant="outline">
                            <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canSync && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => syncMutation.mutate(row.service_order_id)}
                                disabled={syncMutation.isPending}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sincronizar
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelMutation.mutate(row.service_order_id)}
                                disabled={cancelMutation.isPending}
                              >
                                Cancelar Receita
                              </Button>
                            )}
                            {row.issue_type === "critical_divergence" && (
                              <Link to={`/service-orders/${row.service_order_id}`}>
                                <Button size="sm" variant="outline">
                                  <ArrowRight className="h-3.5 w-3.5 mr-1" /> Ver OS
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
