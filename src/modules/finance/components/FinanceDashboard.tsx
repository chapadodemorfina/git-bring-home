import { useFinanceSummary } from "../hooks/useFinance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function FinanceDashboard() {
  const { data: summary, isLoading } = useFinanceSummary();

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
  );

  if (!summary) return null;

  const cards = [
    {
      title: "Receita Total",
      value: summary.totalRevenue,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Despesas Totais",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Comissões",
      value: summary.totalCommissions,
      icon: ArrowDownRight,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Lucro",
      value: summary.profit,
      icon: DollarSign,
      color: summary.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      bgColor: summary.profit >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
    },
    {
      title: "A Receber (Pendente)",
      value: summary.pendingReceivables,
      icon: ArrowUpRight,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "A Pagar (Pendente)",
      value: summary.pendingPayables,
      icon: ArrowDownRight,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    R$ {Number(card.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.overdueCount > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium">
              {summary.overdueCount} lançamento(s) vencido(s). Verifique os pendentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
