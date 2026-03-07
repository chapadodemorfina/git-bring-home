import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const TYPE_LABELS: Record<string, string> = {
  smartphone: "Smartphone",
  tablet: "Tablet",
  notebook: "Notebook",
  desktop: "Desktop",
  console: "Console",
  other: "Outro",
};

interface Props {
  data: Array<{ device_type: string; count?: number }>;
}

export function DeviceTypesChart({ data }: Props) {
  let chartData: Array<{ name: string; value: number }>;

  if (data.length > 0 && "count" in data[0]) {
    chartData = data.map(d => ({
      name: TYPE_LABELS[d.device_type] || d.device_type,
      value: Number(d.count) || 1,
    }));
  } else {
    const counts: Record<string, number> = {};
    data.forEach((d) => { counts[d.device_type] = (counts[d.device_type] || 0) + 1; });
    chartData = Object.entries(counts).map(([type, count]) => ({
      name: TYPE_LABELS[type] || type,
      value: count,
    }));
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Tipos de Dispositivo</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tipos de Dispositivo</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={Object.fromEntries(chartData.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }]))} className="h-64 w-full">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
