import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142 76% 36%)",
  "hsl(280 65% 60%)",
  "hsl(25 95% 53%)",
];

const methodLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Crédito",
  debit_card: "Débito",
  pix: "PIX",
  bank_transfer: "Transferência",
  boleto: "Boleto",
  check: "Cheque",
  other: "Outro",
};

interface Props {
  data: { method: string; count: number; amount: number }[];
}

export function PaymentMethodsChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Vendas por Forma de Pagamento</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: methodLabels[d.method] || d.method,
    value: Number(d.amount),
    count: d.count,
  }));

  const config = Object.fromEntries(chartData.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }]));
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Vendas por Forma de Pagamento</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <ChartTooltip content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
                  <p className="font-medium">{d.name}</p>
                  <p>{fmt(d.value)} ({d.count} vendas)</p>
                </div>
              );
            }} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
