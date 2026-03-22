import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
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
      return data as any[];
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
      qc.invalidateQueries({ queryKey: ["so-financial-summary", serviceOrderId] });
      qc.invalidateQueries({ queryKey: ["financial-entries"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: "Receita sincronizada com a OS!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao sincronizar", description: error.message, variant: "destructive" });
    },
  });

  const revenueEntries = entries?.filter((e: any) => e.entry_type === "revenue" && e.status !== "cancelled") || [];
  const expenseEntries = entries?.filter((e: any) => e.entry_type === "expense") || [];
  const totalRevenue = revenueEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalPaidAmount = revenueEntries.reduce((s: number, e: any) => s + Number(e.paid_amount || 0), 0);
  const totalPending = totalRevenue - totalPaidAmount;

  const isCancelled = orderStatus === "cancelled";
  const isInSync = revenueEntries.length === 1 && Number(revenueEntries[0].amount) === totalAmount;
  const canSync = totalAmount > 0 && !isCancelled;

  return (
    <div className="space-y-6">
      {/* Sync bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sincronização OS → Financeiro
              </p>
              {isInSync ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    Receita sincronizada — {formatBRL(totalAmount)}
                  </span>
                </div>
              ) : revenueEntries.length === 0 && totalAmount > 0 ? (
                <p className="text-sm text-amber-600 mt-1">
                  Nenhuma receita vinculada. Total da OS: {formatBRL(totalAmount)}
                </p>
              ) : totalAmount <= 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  OS sem itens — nada a sincronizar
                </p>
              ) : (
                <p className="text-sm text-amber-600 mt-1">
                  Receita divergente. Financeiro: {formatBRL(totalRevenue)} | OS: {formatBRL(totalAmount)}
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Lançado</span>
            </div>
            <p className="text-lg font-bold font-mono">{formatBRL(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Pago</span>
            </div>
            <p className="text-lg font-bold font-mono text-green-600">{formatBRL(totalPaidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saldo Pendente</span>
            </div>
            <p className={`text-lg font-bold font-mono ${totalPending > 0 ? "text-amber-600" : ""}`}>{formatBRL(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entries list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : !entries?.length ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum lançamento financeiro vinculado a esta OS.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use o botão "Sincronizar Receita" para criar o lançamento automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry: any) => {
                const cfg = statusLabelsMap[entry.status] || statusLabelsMap.pending;
                return (
                  <div key={entry.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge className={cfg.className}>{cfg.label}</Badge>
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
                    <p className={`font-mono font-bold text-sm shrink-0 ${entry.entry_type === "revenue" ? "text-green-600" : "text-red-600"}`}>
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
