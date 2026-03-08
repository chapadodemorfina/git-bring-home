import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertTriangle, Shield, Search, Eye, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const db = supabase as any;

interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

interface SuspiciousActivity {
  frequent_stock_adjustments: any[];
  quote_mods_after_approval: any[];
  deleted_service_orders: any[];
  large_financial_changes: any[];
  voided_warranties: any[];
  summary: { total_actions: number; creates: number; updates: number; deletes: number; tables_affected: number };
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  warranty_voided: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const tableLabels: Record<string, string> = {
  service_orders: "Ordens de Serviço",
  repair_quotes: "Orçamentos",
  financial_entries: "Financeiro",
  payments: "Pagamentos",
  products: "Estoque",
  stock_movements: "Movimentações",
  warranties: "Garantias",
  warranty_returns: "Retornos Garantia",
  collection_point_commissions: "Comissões",
  diagnostics: "Diagnósticos",
  quote_approvals: "Aprovações",
};

function useAuditLogs(filters: { action: string; table_name: string; search: string }) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      let query = db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (filters.action && filters.action !== "all") query = query.eq("action", filters.action);
      if (filters.table_name && filters.table_name !== "all") query = query.eq("table_name", filters.table_name);
      if (filters.search) query = query.or(`record_id.ilike.%${filters.search}%,action.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

function useSuspiciousActivity(days: number) {
  return useQuery({
    queryKey: ["suspicious-activity", days],
    queryFn: async () => {
      const { data, error } = await db.rpc("detect_suspicious_activity", { _days: days });
      if (error) throw error;
      return data as SuspiciousActivity;
    },
  });
}

export default function AuditLogsPage() {
  const [action, setAction] = useState("all");
  const [tableName, setTableName] = useState("all");
  const [search, setSearch] = useState("");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading } = useAuditLogs({ action, table_name: tableName, search });
  const { data: suspicious, isLoading: suspiciousLoading } = useSuspiciousActivity(7);

  const alertCount = suspicious
    ? (suspicious.frequent_stock_adjustments?.length || 0) +
      (suspicious.quote_mods_after_approval?.length || 0) +
      (suspicious.deleted_service_orders?.length || 0) +
      (suspicious.large_financial_changes?.length || 0) +
      (suspicious.voided_warranties?.length || 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria & Antifraude</h1>
        <p className="text-muted-foreground">Rastreamento de ações e detecção de atividades suspeitas</p>
      </div>

      {/* Summary Cards */}
      {suspicious?.summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Ações (7 dias)</p><p className="text-2xl font-bold">{suspicious.summary.total_actions}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Criações</p><p className="text-2xl font-bold text-green-600">{suspicious.summary.creates}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Atualizações</p><p className="text-2xl font-bold text-blue-600">{suspicious.summary.updates}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Exclusões</p><p className="text-2xl font-bold text-destructive">{suspicious.summary.deletes}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-orange-500" /> Alertas</p><p className="text-2xl font-bold text-orange-600">{alertCount}</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs"><FileText className="mr-1 h-4 w-4" /> Logs</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            <AlertTriangle className="mr-1 h-4 w-4" /> Alertas
            {alertCount > 0 && <span className="ml-1 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">{alertCount}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por ID de registro..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Ações</SelectItem>
                <SelectItem value="create">Criar</SelectItem>
                <SelectItem value="update">Atualizar</SelectItem>
                <SelectItem value="delete">Excluir</SelectItem>
                <SelectItem value="warranty_voided">Garantia Anulada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableName} onValueChange={setTableName}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tabela" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Tabelas</SelectItem>
                {Object.entries(tableLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!logs?.length ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                    ) : (
                      logs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm whitespace-nowrap">{format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell><Badge className={actionColors[l.action] || ""}>{l.action}</Badge></TableCell>
                          <TableCell className="text-sm">{tableLabels[l.table_name || ""] || l.table_name || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{l.record_id?.slice(0, 8) || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.user_id?.slice(0, 8) || "sistema"}</TableCell>
                          <TableCell>
                            {(l.old_data || l.new_data) && (
                              <Button variant="ghost" size="sm" onClick={() => setDetailLog(l)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          {suspiciousLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <>
              <AlertSection title="Ajustes de Estoque Frequentes" icon={<Activity className="h-5 w-5 text-orange-500" />}
                items={suspicious?.frequent_stock_adjustments || []}
                render={(item) => <span>{item.user_name} — <strong>{item.count}</strong> ajustes em 7 dias</span>}
              />
              <AlertSection title="Orçamentos Modificados Após Aprovação" icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                items={suspicious?.quote_mods_after_approval || []}
                render={(item) => <span>{item.user_name} modificou orçamento {item.record_id?.slice(0, 8)} em {format(new Date(item.created_at), "dd/MM HH:mm")}</span>}
              />
              <AlertSection title="Ordens de Serviço Excluídas" icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                items={suspicious?.deleted_service_orders || []}
                render={(item) => <span>{item.user_name} excluiu OS {item.old_data?.order_number || item.record_id?.slice(0, 8)} em {format(new Date(item.created_at), "dd/MM HH:mm")}</span>}
              />
              <AlertSection title="Alterações Financeiras Significativas (>R$500)" icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
                items={suspicious?.large_financial_changes || []}
                render={(item) => <span>{item.user_name}: R${item.old_amount} → R${item.new_amount}</span>}
              />
              <AlertSection title="Garantias Anuladas" icon={<Shield className="h-5 w-5 text-orange-500" />}
                items={suspicious?.voided_warranties || []}
                render={(item) => <span>{item.user_name} anulou {item.warranty_number}: {item.reason}</span>}
              />
              {alertCount === 0 && (
                <Card><CardContent className="py-12 text-center"><Shield className="mx-auto h-10 w-10 text-green-500 mb-2" /><p className="text-muted-foreground">Nenhuma atividade suspeita detectada nos últimos 7 dias.</p></CardContent></Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes da Alteração</DialogTitle></DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Ação</p><Badge className={actionColors[detailLog.action] || ""}>{detailLog.action}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Tabela</p><p>{tableLabels[detailLog.table_name || ""] || detailLog.table_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Registro</p><p className="font-mono">{detailLog.record_id}</p></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p>{format(new Date(detailLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p></div>
              </div>
              {detailLog.old_data && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dados Anteriores</p>
                  <ScrollArea className="h-[200px] rounded border p-3">
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(detailLog.old_data, null, 2)}</pre>
                  </ScrollArea>
                </div>
              )}
              {detailLog.new_data && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dados Novos</p>
                  <ScrollArea className="h-[200px] rounded border p-3">
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(detailLog.new_data, null, 2)}</pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertSection({ title, icon, items, render }: {
  title: string;
  icon: React.ReactNode;
  items: any[];
  render: (item: any) => React.ReactNode;
}) {
  if (!items.length) return null;
  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">{icon} {title} <Badge variant="destructive">{items.length}</Badge></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="text-sm p-2 rounded bg-muted/50">{render(item)}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
