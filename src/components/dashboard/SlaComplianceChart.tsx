import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  totalOrders: number;
  slaOverdueCount: number;
}

export function SlaComplianceChart({ totalOrders, slaOverdueCount }: Props) {
  const compliant = Math.max(0, totalOrders - slaOverdueCount);
  const rate = totalOrders > 0 ? Math.round((compliant / totalOrders) * 100) : 100;
  const data = [
    { name: "No prazo", value: compliant },
    { name: "Excedido", value: slaOverdueCount },
  ];

  if (totalOrders === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Conformidade SLA</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Conformidade SLA</CardTitle></CardHeader>
      <CardContent>
        <div className="relative h-[200px] flex items-center justify-center">
          <ChartContainer config={{
            compliant: { label: "No prazo", color: "hsl(var(--chart-2))" },
            overdue: { label: "Excedido", color: "hsl(var(--chart-4))" },
          }} className="h-[200px] w-full">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill="hsl(var(--chart-2))" />
                <Cell fill="hsl(var(--chart-4))" />
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold">{rate}%</span>
            <span className="text-xs text-muted-foreground">no prazo</span>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">No prazo ({compliant})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-chart-4" />
            <span className="text-muted-foreground">Excedido ({slaOverdueCount})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
