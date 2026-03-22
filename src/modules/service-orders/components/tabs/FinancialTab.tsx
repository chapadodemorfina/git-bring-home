import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, AlertCircle, RefreshCw, CheckCircle2, ShieldAlert, Star, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusLabelsMap: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  partial: { label: "Parcial", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  paid: { label: "Pago", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  overdue: { label: "Vencido", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

interface Props {
  serviceOrderId: string;
  totalAmount: number;
  orderStatus: string;
}

export default function FinancialTab({ serviceOrderId, totalAmount, orderStatus }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["so-financial-entries", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("*")
        .eq("service_order_id", serviceOrderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("upsert_os_revenue", {
        _service_order_id: serviceOrderId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["so-financial-entries", serviceOrderId] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-audit"] });
      toast({ title: "Receita principal sincronizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao sincronizar", description: error.message, variant: "destructive" });
    },
  });

  const allEntries = entries || [];
  const primaryRevenue = allEntries.find((e: any) => e.is_primary_os_revenue && e.entry_type === "revenue" && e.status !== "cancelled");
  const auxiliaryRevenues = allEntries.filter((e: any) => e.entry_type === "revenue" && e.status !== "cancelled" && !e.is_primary_os_revenue);
  const expenseEntries = allEntries.filter((e: any) => e.entry_type === "expense" && e.status !== "cancelled");
  const cancelledEntries = allEntries.filter((e: any) => e.status === "cancelled");

  const primaryAmount = Number(primaryRevenue?.amount || 0);
  const primaryPaid = Number(primaryRevenue?.paid_amount || 0);
  const primaryPending = primaryAmount - primaryPaid;
  const primaryStatus = primaryRevenue?.status || null;

  const isCancelled = orderStatus === "cancelled";
  const isInSync = primaryRevenue && primaryAmount === totalAmount;
  const isPrimaryPaid = primaryStatus === "paid";
  const hasDivergence = primaryRevenue && primaryAmount !== totalAmount;
  const hasCriticalDivergence = hasDivergence && isPrimaryPaid;
  const canSync = totalAmount > 0 && !isCancelled && !isPrimaryPaid;

  return (
    <div className="space-y-6">
      {/* Sync bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Receita Principal da OS
              </p>
              {!primaryRevenue && totalAmount > 0 ? (
                <p className="text-sm text-amber-600 mt-1">
                  Nenhuma receita principal. Total da OS: {formatBRL(totalAmount)}
                </p>
              ) : !primaryRevenue && totalAmount <= 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  OS sem itens — nada a sincronizar
                </p>
              ) : hasCriticalDivergence ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm text-destructive font-medium">
                    Divergência crítica — Receita quitada ({formatBRL(primaryAmount)}) ≠ OS ({formatBRL(totalAmount)})
                  </span>
                </div>
              ) : hasDivergence ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-600 font-medium">
                    Divergente — Financeiro: {formatBRL(primaryAmount)} | OS: {formatBRL(totalAmount)}
                  </span>
                </div>
              ) : isInSync ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm text-green-600 font-medium">
                    Sincronizada automaticamente — {formatBRL(totalAmount)}
                  </span>
                </div>
              ) : isCancelled && !primaryRevenue ? (
                <p className="text-sm text-muted-foreground mt-1">
                  OS cancelada — sem receita ativa
                </p>
              ) : null}

              {isPrimaryPaid && hasDivergence && (
                <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/50 rounded px-2 py-1">
                  ⚠️ OS quitada: alterações de itens não atualizam automaticamente a receita principal.
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant={isInSync ? "outline" : "default"}
              onClick={() => syncMutation.mutate()}
              disabled={!canSync || syncMutation.isPending}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {isInSync ? "Ressincronizar" : "Sincronizar Receita"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Primary revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receita Principal</span>
            </div>
            <p className="text-lg font-bold font-mono">{formatBRL(primaryAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pago</span>
            </div>
            <p className="text-lg font-bold font-mono text-green-600">{formatBRL(primaryPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pendente</span>
            </div>
            <p className={`text-lg font-bold font-mono ${primaryPending > 0 ? "text-amber-600" : ""}`}>{formatBRL(Math.max(0, primaryPending))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Auxiliary revenues warning */}
      {auxiliaryRevenues.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-600">
                {auxiliaryRevenues.length} receita(s) auxiliar(es) vinculada(s) a esta OS
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Essas receitas não são a receita principal e não são atualizadas pela sincronização automática.
            </p>
            <div className="mt-2 space-y-1">
              {auxiliaryRevenues.map((entry: any) => {
                const cfg = statusLabelsMap[entry.status] || statusLabelsMap.pending;
                return (
                  <div key={entry.id} className="flex items-center justify-between text-sm border rounded p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={cfg.className} variant="secondary">{cfg.label}</Badge>
                      <span className="truncate text-muted-foreground">{entry.description}</span>
                    </div>
                    <span className="font-mono font-bold shrink-0">{formatBRL(Number(entry.amount))}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All entries list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : !allEntries.length ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum lançamento financeiro vinculado a esta OS.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use o botão "Sincronizar Receita" para criar o lançamento automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {allEntries.map((entry: any) => {
                const cfg = statusLabelsMap[entry.status] || statusLabelsMap.pending;
                const isPrimary = entry.is_primary_os_revenue && entry.entry_type === "revenue";
                return (
                  <div key={entry.id} className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${isPrimary ? "ring-1 ring-primary/30 bg-primary/5" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isPrimary && <Star className="h-3.5 w-3.5 text-primary shrink-0" />}
                        <p className="text-sm font-medium truncate">{entry.description}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
                        {isPrimary && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/40 text-primary">
                            Principal
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {entry.entry_type === "revenue" ? "Receita" : "Despesa"}
                        </span>
                        {entry.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Vence: {format(new Date(entry.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`font-mono font-bold text-sm shrink-0 ${entry.entry_type === "revenue" && entry.status !== "cancelled" ? "text-green-600" : entry.status === "cancelled" ? "text-muted-foreground line-through" : "text-red-600"}`}>
                      {entry.entry_type === "expense" ? "- " : ""}{formatBRL(Number(entry.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
