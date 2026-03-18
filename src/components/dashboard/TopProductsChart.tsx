import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: { name: string; qty: number; revenue: number }[];
}

export function TopProductsChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Top Produtos Vendidos</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 8).map(d => ({
    name: d.name?.length > 20 ? d.name.substring(0, 18) + "…" : d.name,
    qty: d.qty,
    revenue: Number(d.revenue),
  }));

  const config = {
    revenue: { label: "Receita", color: "hsl(var(--chart-2))" },
    qty: { label: "Qtd", color: "hsl(var(--chart-1))" },
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Top Produtos Vendidos</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[300px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
