import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ cp_id: string; name: string; count: number }>;
}

export function CollectionPointsChart({ data }: Props) {
  const chartData = data.map(cp => ({
    name: cp.name || cp.cp_id.slice(0, 8),
    orders: cp.count,
  })).sort((a, b) => b.orders - a.orders);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Pontos de Coleta</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados de pontos de coleta no período</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pontos de Coleta</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{
          orders: { label: "Ordens", color: "hsl(var(--chart-3))" },
        }} className="h-64 w-full">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={11} tickLine={false} />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
