import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ month: string; orders: number; revenue: number }>;
}

export function OrdersTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Tendência de OS</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  const config = {
    orders: { label: "Ordens", color: "hsl(var(--chart-1))" },
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tendência de OS por Mês</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[220px] w-full">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
