import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

export default function FinancialTab({ serviceOrderId }: Props) {
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

  const revenueEntries = entries?.filter((e: any) => e.entry_type === "revenue") || [];
  const expenseEntries = entries?.filter((e: any) => e.entry_type === "expense") || [];
  const totalRevenue = revenueEntries.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalPaid = revenueEntries.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalPending = totalRevenue - totalPaid;

  return (
    <div className="space-y-6">
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
            <p className="text-lg font-bold font-mono text-green-600">{formatBRL(totalPaid)}</p>
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
                Os lançamentos são criados quando um orçamento é aprovado ou manualmente pelo módulo Financeiro.
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
                      <div className="flex items-center gap-2 mt-0.5">
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

      {expenseEntries.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Despesas vinculadas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseEntries.map((entry: any) => {
                const cfg = statusLabelsMap[entry.status] || statusLabelsMap.pending;
                return (
                  <div key={entry.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{entry.description}</p>
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                    </div>
                    <p className="font-mono font-bold text-sm text-red-600 shrink-0">
                      - {formatBRL(Number(entry.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
