import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, DollarSign, Clock, CheckCircle, AlertTriangle, TrendingUp, Wrench, Shield } from "lucide-react";

interface Props {
  totalOrders: number;
  openOrders: number;
  avgTurnaroundHours: number | null;
  quoteApprovalRate: number | null;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  warrantyReturnRate: number | null;
  slaOverdueCount?: number;
}

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function KpiCards(props: Props) {
  const cards = [
    { title: "Ordens de Serviço", value: String(props.totalOrders), sub: `${props.openOrders} em aberto`, icon: ClipboardList, color: "text-chart-1" },
    { title: "Tempo Médio (h)", value: props.avgTurnaroundHours != null ? `${props.avgTurnaroundHours}h` : "—", sub: "Recebido → Entregue", icon: Clock, color: "text-chart-3" },
    { title: "Aprovação de Orçamento", value: props.quoteApprovalRate != null ? `${props.quoteApprovalRate}%` : "—", sub: "Taxa de aprovação", icon: CheckCircle, color: "text-chart-2" },
    { title: "Receita", value: fmt(props.totalRevenue), sub: "No período", icon: DollarSign, color: "text-chart-2" },
    { title: "Despesas", value: fmt(props.totalExpenses), sub: "No período", icon: AlertTriangle, color: "text-chart-4" },
    { title: "Lucro", value: fmt(props.profit), sub: "Receita - Despesas", icon: TrendingUp, color: props.profit >= 0 ? "text-chart-2" : "text-chart-4" },
    { title: "Retorno em Garantia", value: props.warrantyReturnRate != null ? `${props.warrantyReturnRate}%` : "—", sub: "Taxa de retorno", icon: Shield, color: "text-chart-5" },
    { title: "SLA Excedido", value: props.slaOverdueCount != null ? String(props.slaOverdueCount) : "—", sub: "OS fora do prazo", icon: Wrench, color: (props.slaOverdueCount || 0) > 0 ? "text-destructive" : "text-chart-1" },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
            </div>
            <p className="text-xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
