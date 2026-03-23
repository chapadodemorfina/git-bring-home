import { useFinanceSummary } from "../hooks/useFinance";
import { useFinancialBalances } from "@/modules/cash-register/hooks/useCashRegister";
import { useReceivablesSummary } from "@/modules/receivables/hooks/useReceivables";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet,
  Banknote, Landmark, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Receipt, ListChecks, Filter,
  Clock,
} from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function FinanceHubDashboard() {
  const { data: summary, isLoading: loadingSummary } = useFinanceSummary();
  const { data: balances, isLoading: loadingBalances } = useFinancialBalances();
  const { data: recSummary, isLoading: loadingRec } = useReceivablesSummary();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();

  const isLoading = loadingSummary || loadingBalances || loadingRec;

  const s = summary || { total_revenue: 0, total_expenses: 0, profit: 0, pending_receivables: 0, overdue_count: 0 };
  const b = balances || { cash_balance: 0, bank_balance: 0, today_income: 0, today_expenses: 0, receivables_total: 0, payables_total: 0, overdue_count: 0, is_register_open: false };
  const r = recSummary || { total_receivable: 0, total_overdue: 0, overdue_count: 0, received_month: 0, open_count: 0, total_count: 0 };

  const consolidated = Number(b.cash_balance) + Number(b.bank_balance);

  const kpis = [
    { label: "Receita", value: fmt(s.total_revenue), icon: TrendingUp, color: "text-chart-2" },
    { label: "Despesas", value: fmt(s.total_expenses), icon: TrendingDown, color: "text-chart-4" },
    { label: "Lucro", value: fmt(s.profit), icon: DollarSign, color: s.profit >= 0 ? "text-chart-2" : "text-destructive" },
    { label: "Saldo Caixa", value: fmt(Number(b.cash_balance)), icon: Banknote, color: "text-chart-2", sub: b.is_register_open ? "Aberto" : "Fechado" },
    { label: "Saldo Banco", value: fmt(Number(b.bank_balance)), icon: Landmark, color: "text-chart-1" },
    { label: "Consolidado", value: fmt(consolidated), icon: Wallet, color: consolidated >= 0 ? "text-chart-2" : "text-destructive" },
    { label: "Entradas Hoje", value: fmt(Number(b.today_income)), icon: ArrowUpRight, color: "text-chart-2" },
    { label: "Saídas Hoje", value: fmt(Number(b.today_expenses)), icon: ArrowDownRight, color: "text-chart-4" },
  ];

  const goTab = (tab: string) => setParams({ tab }, { replace: true });

  const shortcuts = [
    { label: "Contas a Receber", icon: Receipt, onClick: () => goTab("receivables"), variant: "outline" as const },
    { label: "Controle de Caixa", icon: Banknote, onClick: () => goTab("cash-register"), variant: "outline" as const },
    { label: "Lançamentos", icon: ListChecks, onClick: () => goTab("entries"), variant: "outline" as const },
    { label: "Pendentes", icon: Filter, onClick: () => goTab("entries"), variant: "outline" as const },
    { label: "Vencidos", icon: Clock, onClick: () => goTab("receivables"), variant: "outline" as const },
  ];

  const alerts = [
    r.overdue_count > 0 && {
      label: `${r.overdue_count} conta(s) vencida(s) — R$ ${Number(r.total_overdue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      color: "bg-destructive/10 text-destructive border-destructive/20",
    },
    r.open_count > 0 && {
      label: `${r.open_count} recebimento(s) pendente(s) — R$ ${Number(r.total_receivable).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      color: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    },
    Number(b.payables_total) > 0 && {
      label: `R$ ${Number(b.payables_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} a pagar pendente`,
      color: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    },
    b.is_register_open && Number(b.today_income) > 0 && {
      label: `Caixa aberto com ${fmt(Number(b.today_income))} em entradas hoje`,
      color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2 px-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold">{kpi.value}</p>
                  {kpi.sub && <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Button key={s.label} variant={s.variant} size="sm" onClick={s.onClick} className="gap-1.5">
            <s.icon className="h-4 w-4" />
            {s.label}
          </Button>
        ))}
      </div>

      {/* Attention Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Badge key={a.label} variant="outline" className={`${a.color} text-xs py-1 px-2.5 font-medium`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {a.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
