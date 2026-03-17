import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
}

interface Props {
  entries: FinancialEntry[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  partial: { label: "Parcial", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

export default function PortalFinancialSummary({ entries }: Props) {
  const openEntries = entries.filter((e) => ["pending", "partial", "overdue"].includes(e.status));
  const totalOpen = openEntries.reduce((sum, e) => sum + (e.amount - e.paid_amount), 0);
  const overdueCount = openEntries.filter((e) => e.status === "overdue").length;

  if (!entries.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalOpen > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              {overdueCount > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <span className="text-sm font-medium">Saldo em aberto</span>
            </div>
            <span className="font-bold font-mono text-lg">
              R$ {totalOpen.toFixed(2)}
            </span>
          </div>
        )}

        {openEntries.length > 0 && (
          <div className="space-y-2">
            {openEntries.map((entry) => {
              const s = statusMap[entry.status] || statusMap.pending;
              return (
                <div key={entry.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="truncate">{entry.description}</p>
                    {entry.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Venc.: {format(new Date(entry.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={s.color + " text-[10px]"}>{s.label}</Badge>
                    <span className="font-mono text-sm">
                      R$ {(entry.amount - entry.paid_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalOpen === 0 && entries.length > 0 && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Nenhum saldo em aberto</p>
        )}
      </CardContent>
    </Card>
  );
}
