import { useFinanceSummary } from "../hooks/useFinance";
import { useFinancialBalances } from "@/modules/cash-register/hooks/useCashRegister";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Landmark, Banknote, Wallet,
} from "lucide-react";

const defaultSummary = {
  total_revenue: 0,
  total_expenses: 0,
  total_commissions: 0,
  pending_receivables: 0,
  pending_payables: 0,
  overdue_count: 0,
  profit: 0,
};

export default function FinanceDashboard() {
  const { data: rawSummary, isLoading: loadingSummary, error: errorSummary } = useFinanceSummary();
  const { data: balances, isLoading: loadingBalances } = useFinancialBalances();

  const isLoading = loadingSummary || loadingBalances;

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
  );

  if (errorSummary) return (
    <Card className="border-destructive">
      <CardContent className="pt-6 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar resumo financeiro</p>
      </CardContent>
    </Card>
  );

  const summary = { ...defaultSummary, ...rawSummary };
  const bal = balances || { cash_balance: 0, bank_balance: 0, today_income: 0, today_expenses: 0, receivables_total: 0, payables_total: 0, overdue_count: 0, is_register_open: false };

  const consolidated = Number(bal.cash_balance) + Number(bal.bank_balance);

  const balanceCards = [
    {
      title: "Saldo em Caixa",
      value: bal.cash_balance,
      icon: Banknote,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
      sub: bal.is_register_open ? "Caixa aberto" : "Caixa fechado",
    },
    {
      title: "Saldo Bancário",
      value: bal.bank_balance,
      icon: Landmark,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Saldo Consolidado",
      value: consolidated,
      icon: Wallet,
      color: consolidated >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      bgColor: consolidated >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
      sub: "Caixa + Banco",
    },
    {
      title: "Entradas Hoje",
      value: bal.today_income,
      icon: ArrowUpRight,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Saídas Hoje",
      value: bal.today_expenses,
      icon: ArrowDownRight,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
  ];

  const periodCards = [
    {
      title: "Receita (período)",
      value: summary.total_revenue,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Despesas (período)",
      value: summary.total_expenses,
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Lucro (período)",
      value: summary.profit,
      icon: DollarSign,
      color: summary.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      bgColor: summary.profit >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
    },
    {
      title: "A Receber (Pendente)",
      value: bal.receivables_total,
      icon: ArrowUpRight,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "A Pagar (Pendente)",
      value: bal.payables_total,
      icon: ArrowDownRight,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Balance Strip */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Saldos Atuais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {balanceCards.map((card) => (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      R$ {Number(card.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Period indicators */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Indicadores do Período</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {periodCards.map((card) => (
            <Card key={card.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      R$ {Number(card.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
      </div>

      {(bal.overdue_count ?? 0) > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium">
              {bal.overdue_count} lançamento(s) vencido(s). Verifique os pendentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
