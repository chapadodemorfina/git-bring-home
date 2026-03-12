import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
}

export function RevenueTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Receita e Lucro Mensal</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  const config = {
    revenue: { label: "Receita", color: "hsl(var(--chart-2))" },
    expenses: { label: "Despesas", color: "hsl(var(--chart-4))" },
    profit: { label: "Lucro", color: "hsl(var(--chart-1))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receita e Lucro Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px] w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="revenue" stackId="1" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.3} />
            <Area type="monotone" dataKey="expenses" stackId="2" stroke="var(--color-expenses)" fill="var(--color-expenses)" fillOpacity={0.3} />
            <Area type="monotone" dataKey="profit" stroke="var(--color-profit)" fill="var(--color-profit)" fillOpacity={0.1} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
