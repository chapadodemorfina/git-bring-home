import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  received: "Recebido",
  triage: "Triagem",
  awaiting_diagnosis: "Aguard. Diag.",
  awaiting_quote: "Aguard. Orçamento",
  awaiting_customer_approval: "Aguard. Aprov.",
  in_repair: "Em Reparo",
  awaiting_parts: "Aguard. Peças",
  in_testing: "Em Teste",
  ready_for_pickup: "Pronto Retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

interface Props {
  data: Array<{ status: string; count?: number }>;
}

export function OrdersByStatusChart({ data }: Props) {
  // If data comes pre-aggregated (from RPC) use directly, otherwise aggregate
  let chartData: Array<{ status: string; label: string; count: number }>;

  if (data.length > 0 && "count" in data[0]) {
    chartData = data.map(d => ({
      status: d.status,
      label: STATUS_LABELS[d.status] || d.status,
      count: Number(d.count) || 0,
    }));
  } else {
    const counts: Record<string, number> = {};
    data.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    chartData = Object.entries(counts).map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] || status,
      count,
    }));
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">OS por Status</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ count: { label: "Quantidade", color: "hsl(var(--chart-1))" } }} className="h-64 w-full">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={11} tickLine={false} />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
