import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCommissionRules, useCreateCommissionRule, useUpdateCommissionRule, useDeleteCommissionRule,
  useCommissionEntries, useCommissionSummary, useUpdateCommissionStatus,
} from "../hooks/useCommissions";
import { useGoals, useGoalProgress, useCreateGoal, useDeleteGoal } from "../hooks/useGoals";
import { useTeamRanking, type RankingEntry } from "../hooks/useRanking";
import { useAllProducts } from "@/modules/inventory/hooks/useInventory";
import type {
  CommissionRule, CommissionEntryStatus, CommissionSourceType, CommissionBaseType, SalesGoal,
} from "../types";
import {
  statusLabels, statusColors, roleLabels, sourceTypeLabels, baseTypeLabels, goalTypeLabels,
} from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import DataPagination from "@/components/ui/data-pagination";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign, Clock, CheckCircle2, Banknote, TrendingUp,
  Settings2, Plus, MoreHorizontal, Trash2, Eye, Ban, Loader2, Target, Trophy,
  BarChart3, Download, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const medals = ["🥇", "🥈", "🥉"];

export default function CommissionsPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const isAdmin = hasRole("admin") || hasRole("manager");
  const isFinance = hasRole("finance");
  const canManage = isAdmin || isFinance;

  const [tab, setTab] = useState("entries");
  const [page, setPage] = useState(1);
  const [goalsPage, setGoalsPage] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState<CommissionEntryStatus | "all">("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Rule dialog
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    role: "front_desk",
    label: "",
    source_type: "sale" as CommissionSourceType,
    base_type: "total_amount" as CommissionBaseType,
    percentage: 0,
    fixed_amount: 0,
    only_after_payment: false,
    product_id: "" as string,
    category_filter: "",
    notes: "",
  });

  // Goal dialog
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({
    label: "",
    goal_type: "revenue" as "revenue" | "quantity" | "ticket_avg",
    target_value: 0,
    period_start: "",
    period_end: "",
    team_role: "" as string,
    notes: "",
  });

  // Queries
  const { data: rules = [], isLoading: loadingRules } = useCommissionRules();
  const { data: entries } = useCommissionEntries(page, {
    status: filterStatus === "all" ? null : filterStatus,
    role: filterRole === "all" ? null : filterRole,
    dateFrom: filterDateFrom || null,
    dateTo: filterDateTo || null,
  });
  const { data: summary } = useCommissionSummary(filterDateFrom || null, filterDateTo || null);
  const { data: goalsData } = useGoals(goalsPage);
  const goalIds = (goalsData?.items || []).map((g) => g.id);
  const { data: goalProgress = [] } = useGoalProgress(goalIds);
  const { data: ranking = [] } = useTeamRanking(filterDateFrom || null, filterDateTo || null);
  const { data: allProducts = [] } = useAllProducts();

  // Mutations
  const createRule = useCreateCommissionRule();
  const updateRule = useUpdateCommissionRule();
  const deleteRule = useDeleteCommissionRule();
  const updateStatus = useUpdateCommissionStatus();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();

  // Reports data
  const reportsByUser = useMemo(() => {
    if (!entries?.items) return [];
    const map = new Map<string, { name: string; role: string; pending: number; approved: number; paid: number; total: number; count: number }>();
    entries.items.forEach((e) => {
      const key = e.user_id;
      const cur = map.get(key) || { name: e.user_name || "—", role: e.role, pending: 0, approved: 0, paid: 0, total: 0, count: 0 };
      cur.count++;
      cur.total += e.commission_amount;
      if (e.status === "pending") cur.pending += e.commission_amount;
      if (e.status === "approved") cur.approved += e.commission_amount;
      if (e.status === "paid") cur.paid += e.commission_amount;
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total);
  }, [entries]);

  const handleSaveRule = () => {
    const payload = {
      ...ruleForm,
      percentage: Number(ruleForm.percentage),
      fixed_amount: Number(ruleForm.fixed_amount),
      product_id: ruleForm.product_id || null,
      category_filter: ruleForm.category_filter || null,
      notes: ruleForm.notes || null,
    };
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data: payload }, {
        onSuccess: () => { setShowRuleDialog(false); setEditingRule(null); },
      });
    } else {
      createRule.mutate(payload, { onSuccess: () => setShowRuleDialog(false) });
    }
  };

  const openEditRule = (rule: CommissionRule) => {
    setEditingRule(rule);
    setRuleForm({
      role: rule.role, label: rule.label, source_type: rule.source_type,
      base_type: rule.base_type, percentage: rule.percentage,
      fixed_amount: rule.fixed_amount, only_after_payment: rule.only_after_payment,
      product_id: rule.product_id || "",
      category_filter: rule.category_filter || "",
      notes: rule.notes || "",
    });
    setShowRuleDialog(true);
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleForm({
      role: "front_desk", label: "", source_type: "sale",
      base_type: "total_amount", percentage: 0, fixed_amount: 0,
      only_after_payment: false, product_id: "", category_filter: "", notes: "",
    });
    setShowRuleDialog(true);
  };

  const handleSaveGoal = () => {
    createGoal.mutate({
      ...goalForm,
      target_value: Number(goalForm.target_value),
      team_role: goalForm.team_role || null,
      user_id: null,
      notes: goalForm.notes || null,
    } as any, { onSuccess: () => setShowGoalDialog(false) });
  };

  const clearFilters = () => {
    setFilterStatus("all"); setFilterRole("all");
    setFilterDateFrom(""); setFilterDateTo(""); setPage(1);
  };

  const navigateToSource = (sourceType: string, sourceId: string) => {
    if (sourceType === "sale") navigate(`/sales/${sourceId}`);
    else if (sourceType === "service_order") navigate(`/service-orders/${sourceId}`);
  };

  const exportCsv = () => {
    if (!entries?.items?.length) return;
    const header = "Data,Usuário,Função,Origem,Base,Comissão,Status\n";
    const rows = entries.items.map((e) =>
      `${e.reference_date},${e.user_name || ""},${roleLabels[e.role] || e.role},${sourceTypeLabels[e.source_type as keyof typeof sourceTypeLabels] || e.source_type},${e.base_amount},${e.commission_amount},${statusLabels[e.status]}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `comissoes_${filterDateFrom || "all"}_${filterDateTo || "all"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Unique categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p: any) => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [allProducts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comissões & Metas</h1>
          <p className="text-sm text-muted-foreground">Gestão de comissões por vendas, serviços e metas da equipe</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard icon={<Clock className="h-4 w-4" />} label="Pendentes" value={fmt(summary?.total_pending || 0)} count={summary?.count_pending || 0} color="text-amber-600" />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aprovadas" value={fmt(summary?.total_approved || 0)} count={summary?.count_approved || 0} color="text-blue-600" />
        <SummaryCard icon={<Banknote className="h-4 w-4" />} label="Pagas" value={fmt(summary?.total_paid || 0)} count={summary?.count_paid || 0} color="text-green-600" />
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Total Mês" value={fmt(summary?.total_month || 0)} color="text-primary font-bold" />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Total Geral" value={fmt((summary?.total_pending || 0) + (summary?.total_approved || 0) + (summary?.total_paid || 0))} color="text-foreground font-bold" />
      </div>

      {/* Global date filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} className="w-40" />
        </div>
        {(filterStatus !== "all" || filterRole !== "all" || filterDateFrom || filterDateTo) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="entries"><DollarSign className="h-4 w-4 mr-1" /> Lançamentos</TabsTrigger>
          {canManage && <TabsTrigger value="goals"><Target className="h-4 w-4 mr-1" /> Metas</TabsTrigger>}
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1" /> Ranking</TabsTrigger>
          {canManage && <TabsTrigger value="reports"><BarChart3 className="h-4 w-4 mr-1" /> Relatórios</TabsTrigger>}
          {isAdmin && <TabsTrigger value="rules"><Settings2 className="h-4 w-4 mr-1" /> Regras</TabsTrigger>}
        </TabsList>

        {/* ── Entries Tab ── */}
        <TabsContent value="entries" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as any); setPage(1); }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Função</label>
              <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setPage(1); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              {entries && entries.items.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Ref.</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage && <TableHead></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.items.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{format(new Date(e.reference_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-sm font-medium">{e.user_name || "—"}</TableCell>
                          <TableCell className="text-sm">{roleLabels[e.role] || e.role}</TableCell>
                          <TableCell className="text-sm">{sourceTypeLabels[e.source_type as keyof typeof sourceTypeLabels] || e.source_type}</TableCell>
                          <TableCell>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => navigateToSource(e.source_type, e.source_id)}>
                              {e.source_label || e.source_id.substring(0, 8)}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right text-sm">{fmt(e.base_amount)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{fmt(e.commission_amount)}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", statusColors[e.status])}>{statusLabels[e.status]}</Badge>
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigateToSource(e.source_type, e.source_id)}>
                                    <Eye className="h-4 w-4 mr-2" /> Ver Origem
                                  </DropdownMenuItem>
                                  {e.status === "pending" && (
                                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: e.id, status: "approved" })}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
                                    </DropdownMenuItem>
                                  )}
                                  {(e.status === "pending" || e.status === "approved") && (
                                    <DropdownMenuItem onClick={() => updateStatus.mutate({ id: e.id, status: "paid" })}>
                                      <Banknote className="h-4 w-4 mr-2" /> Marcar como Paga
                                    </DropdownMenuItem>
                                  )}
                                  {e.status !== "cancelled" && e.status !== "paid" && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => updateStatus.mutate({ id: e.id, status: "cancelled" })}>
                                      <Ban className="h-4 w-4 mr-2" /> Cancelar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataPagination page={entries.page} pageSize={entries.pageSize} total={entries.total} onPageChange={setPage} />
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma comissão encontrada</p>
                  <p className="text-sm mt-1">Configure regras e finalize vendas/OS para gerar comissões.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Goals Tab ── */}
        {canManage && (
          <TabsContent value="goals" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setGoalForm({ label: "", goal_type: "revenue", target_value: 0, period_start: "", period_end: "", team_role: "", notes: "" });
                setShowGoalDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" /> Nova Meta
              </Button>
            </div>

            {goalProgress.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goalProgress.map((gp) => (
                  <Card key={gp.goal_id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        {gp.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{goalTypeLabels[gp.goal_type]}</span>
                        <span className="font-semibold">{gp.percentage}%</span>
                      </div>
                      <Progress value={Math.min(gp.percentage, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Atual: {gp.goal_type === "revenue" ? fmt(gp.actual) : gp.actual}</span>
                        <span>Meta: {gp.goal_type === "revenue" ? fmt(gp.target) : gp.target}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {gp.team_role ? roleLabels[gp.team_role] || gp.team_role : "Individual"} · {gp.period_start} a {gp.period_end}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                {goalsData && goalsData.items.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meta</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead className="text-right">Valor Alvo</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalsData.items.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium text-sm">{g.label}</TableCell>
                            <TableCell className="text-sm">{goalTypeLabels[g.goal_type]}</TableCell>
                            <TableCell className="text-sm">{g.team_role ? (roleLabels[g.team_role] || g.team_role) : (g.user_name || "—")}</TableCell>
                            <TableCell className="text-right text-sm font-mono">
                              {g.goal_type === "revenue" ? fmt(g.target_value) : g.target_value}
                            </TableCell>
                            <TableCell className="text-sm">{format(new Date(g.period_start), "dd/MM/yy")} - {format(new Date(g.period_end), "dd/MM/yy")}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteGoal.mutate(g.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <DataPagination page={goalsData.page} pageSize={goalsData.pageSize} total={goalsData.total} onPageChange={setGoalsPage} />
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma meta configurada</p>
                    <p className="text-sm mt-1">Crie metas de faturamento, quantidade ou ticket médio.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Ranking Tab ── */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Ranking da Equipe</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ranking.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-center">Serviços</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((m, idx) => (
                      <TableRow key={m.user_id}>
                        <TableCell className="font-bold text-lg">{idx < 3 ? medals[idx] : idx + 1}</TableCell>
                        <TableCell className="font-medium">{m.name || "—"}</TableCell>
                        <TableCell className="text-sm">{roleLabels[m.role] || m.role || "—"}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{m.sales_count}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{m.so_count}</Badge></TableCell>
                        <TableCell className="text-right font-mono font-semibold">{fmt(Number(m.total_revenue))}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(Number(m.ticket_avg))}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-600">{fmt(Number(m.commission_total))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Sem dados no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports Tab ── */}
        {canManage && (
          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries?.items?.length}>
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
            </div>

            {/* Summary by user */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Resumo por Usuário</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {reportsByUser.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Pendente</TableHead>
                        <TableHead className="text-right">Aprovada</TableHead>
                        <TableHead className="text-right">Paga</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportsByUser.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-sm">{roleLabels[r.role] || r.role}</TableCell>
                          <TableCell className="text-center">{r.count}</TableCell>
                          <TableCell className="text-right text-amber-600">{fmt(r.pending)}</TableCell>
                          <TableCell className="text-right text-blue-600">{fmt(r.approved)}</TableCell>
                          <TableCell className="text-right text-green-600">{fmt(r.paid)}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(r.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhum dado para o período selecionado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary by role */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Resumo por Função</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(() => {
                  const byRole = new Map<string, { total: number; count: number }>();
                  entries?.items?.forEach((e) => {
                    const cur = byRole.get(e.role) || { total: 0, count: 0 };
                    cur.total += e.commission_amount;
                    cur.count++;
                    byRole.set(e.role, cur);
                  });
                  const arr = Array.from(byRole.entries()).sort((a, b) => b[1].total - a[1].total);
                  if (arr.length === 0) return <div className="text-center py-8 text-muted-foreground text-sm">Sem dados</div>;
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Função</TableHead>
                          <TableHead className="text-center">Lançamentos</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arr.map(([role, v]) => (
                          <TableRow key={role}>
                            <TableCell className="font-medium">{roleLabels[role] || role}</TableCell>
                            <TableCell className="text-center">{v.count}</TableCell>
                            <TableCell className="text-right font-semibold">{fmt(v.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Rules Tab ── */}
        {isAdmin && (
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNewRule}><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {rules.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>Fixo</TableHead>
                        <TableHead>Filtro</TableHead>
                        <TableHead>Pós-Pgto</TableHead>
                        <TableHead>Ativa</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-sm">{r.label}</TableCell>
                          <TableCell className="text-sm">{roleLabels[r.role] || r.role}</TableCell>
                          <TableCell className="text-sm">{sourceTypeLabels[r.source_type]}</TableCell>
                          <TableCell className="text-sm">{baseTypeLabels[r.base_type]}</TableCell>
                          <TableCell className="text-sm">{r.percentage > 0 ? `${r.percentage}%` : "—"}</TableCell>
                          <TableCell className="text-sm">{r.fixed_amount > 0 ? fmt(r.fixed_amount) : "—"}</TableCell>
                          <TableCell className="text-xs">
                            {r.product_id ? <Badge variant="outline" className="text-xs">Produto</Badge> : null}
                            {r.category_filter ? <Badge variant="outline" className="text-xs ml-1">{r.category_filter}</Badge> : null}
                            {!r.product_id && !r.category_filter ? "—" : null}
                          </TableCell>
                          <TableCell>{r.only_after_payment ? <Badge variant="secondary" className="text-xs">Sim</Badge> : "—"}</TableCell>
                          <TableCell>
                            <Switch checked={r.is_active} onCheckedChange={(v) => updateRule.mutate({ id: r.id, data: { is_active: v } })} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditRule(r)}>Editar</Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRule.mutate(r.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma regra configurada</p>
                    <p className="text-sm mt-1">Crie regras para gerar comissões automaticamente.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Rule Dialog ── */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Comissão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={ruleForm.label} onChange={(e) => setRuleForm({ ...ruleForm, label: e.target.value })} placeholder="Ex: Comissão vendedor PDV" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Função</label>
                <Select value={ruleForm.role} onValueChange={(v) => setRuleForm({ ...ruleForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Origem</label>
                <Select value={ruleForm.source_type} onValueChange={(v) => setRuleForm({ ...ruleForm, source_type: v as CommissionSourceType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="service_order">Ordem de Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Base de Cálculo</label>
              <Select value={ruleForm.base_type} onValueChange={(v) => setRuleForm({ ...ruleForm, base_type: v as CommissionBaseType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(baseTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Percentual (%)</label>
                <Input type="number" min={0} step={0.1} value={ruleForm.percentage} onChange={(e) => setRuleForm({ ...ruleForm, percentage: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-sm font-medium">Valor Fixo (R$)</label>
                <Input type="number" min={0} step={0.01} value={ruleForm.fixed_amount} onChange={(e) => setRuleForm({ ...ruleForm, fixed_amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Product filter */}
            <div>
              <label className="text-sm font-medium">Produto específico (opcional)</label>
              <Select value={ruleForm.product_id || "none"} onValueChange={(v) => setRuleForm({ ...ruleForm, product_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todos os produtos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos os produtos</SelectItem>
                  {allProducts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div>
              <label className="text-sm font-medium">Categoria (opcional)</label>
              <Select value={ruleForm.category_filter || "none"} onValueChange={(v) => setRuleForm({ ...ruleForm, category_filter: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas as categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={ruleForm.only_after_payment} onCheckedChange={(v) => setRuleForm({ ...ruleForm, only_after_payment: v })} />
              <label className="text-sm">Somente após pagamento confirmado</label>
            </div>
            <p className="text-xs text-muted-foreground">Se valor fixo &gt; 0, será usado em vez do percentual.</p>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRuleDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveRule} disabled={!ruleForm.label || (createRule.isPending || updateRule.isPending)}>
              {(createRule.isPending || updateRule.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRule ? "Salvar" : "Criar Regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Goal Dialog ── */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Meta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={goalForm.label} onChange={(e) => setGoalForm({ ...goalForm, label: e.target.value })} placeholder="Ex: Meta vendas março" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo de Meta</label>
                <Select value={goalForm.goal_type} onValueChange={(v) => setGoalForm({ ...goalForm, goal_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Faturamento</SelectItem>
                    <SelectItem value="quantity">Quantidade</SelectItem>
                    <SelectItem value="ticket_avg">Ticket Médio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Valor Alvo</label>
                <Input type="number" min={0} step={0.01} value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Início</label>
                <Input type="date" value={goalForm.period_start} onChange={(e) => setGoalForm({ ...goalForm, period_start: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Fim</label>
                <Input type="date" value={goalForm.period_end} onChange={(e) => setGoalForm({ ...goalForm, period_end: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Função (equipe)</label>
              <Select value={goalForm.team_role || "all"} onValueChange={(v) => setGoalForm({ ...goalForm, team_role: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a equipe</SelectItem>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={goalForm.notes} onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGoalDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveGoal} disabled={!goalForm.label || !goalForm.period_start || !goalForm.period_end || createGoal.isPending}>
              {createGoal.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, count, color }: {
  icon: React.ReactNode; label: string; value: string; count?: number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={color}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-lg font-bold", color)}>{value}</p>
        {count !== undefined && <p className="text-xs text-muted-foreground">{count} registro(s)</p>}
      </CardContent>
    </Card>
  );
}
