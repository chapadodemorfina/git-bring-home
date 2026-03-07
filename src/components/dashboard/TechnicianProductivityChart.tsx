import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ technician_id: string; name: string; count: number }>;
}

export function TechnicianProductivityChart({ data }: Props) {
  const chartData = data.map(t => ({
    name: t.name || t.technician_id.slice(0, 8),
    total: t.count,
  })).sort((a, b) => b.total - a.total).slice(0, 10);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Produtividade Técnicos</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Produtividade Técnicos</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{
          total: { label: "Total OS", color: "hsl(var(--chart-2))" },
        }} className="h-64 w-full">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={100} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
