import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ cause: string; count: number }>;
}

export function CommonDefectsChart({ data }: Props) {
  const chartData = data
    .map(d => ({
      defect: d.cause.length > 30 ? d.cause.slice(0, 30) + "…" : d.cause,
      count: d.count,
    }))
    .slice(0, 8);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Defeitos Comuns</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Defeitos Comuns</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ count: { label: "Ocorrências", color: "hsl(var(--chart-4))" } }} className="h-64 w-full">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="defect" type="category" width={120} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
