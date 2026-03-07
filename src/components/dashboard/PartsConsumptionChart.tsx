import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data?: Array<{ product_id: string; quantity: number; total_cost: number; total_price: number }>;
}

export function PartsConsumptionChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Consumo de Peças</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Dados de consumo de peças disponíveis na página de estoque</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Consumo de Peças</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          {data.length} registros de consumo no período
        </p>
      </CardContent>
    </Card>
  );
}
