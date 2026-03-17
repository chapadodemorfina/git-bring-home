import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  total: number;
  approved: number;
  rejected: number;
}

export function QuoteConversionChart({ total, approved, rejected }: Props) {
  const pending = Math.max(0, total - approved - rejected);

  const data = [
    { stage: "Enviados", value: total },
    { stage: "Aprovados", value: approved },
    { stage: "Rejeitados", value: rejected },
    { stage: "Pendentes", value: pending },
  ];

  if (total === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Funil de Orçamentos</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem orçamentos no período</p></CardContent>
      </Card>
    );
  }

  const config = {
    value: { label: "Quantidade", color: "hsl(var(--chart-1))" },
  };

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-3))",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funil de Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[220px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" fontSize={11} />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="grid grid-cols-2 gap-2 mt-3 text-center">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-lg font-bold text-chart-2">{total > 0 ? Math.round((approved / total) * 100) : 0}%</p>
            <p className="text-[11px] text-muted-foreground">Taxa de aprovação</p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-lg font-bold text-chart-4">{total > 0 ? Math.round((rejected / total) * 100) : 0}%</p>
            <p className="text-[11px] text-muted-foreground">Taxa de rejeição</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Need to import Cell from recharts
import { Cell } from "recharts";
