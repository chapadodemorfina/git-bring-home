import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, CheckCircle, Clock, DollarSign, Banknote, AlertCircle } from "lucide-react";
import { useMyCollectionPoint, usePartnerDashboard } from "../hooks/usePartnerPortal";

export default function PartnerDashboardPage() {
  const { data: cp, isLoading: cpLoading, error: cpError } = useMyCollectionPoint();
  const { data: kpis, isLoading: kpiLoading } = usePartnerDashboard(cp?.id);

  if (cpLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (cpError) return (
    <Card><CardContent className="py-12 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
      <p className="text-muted-foreground">Nenhum ponto de coleta vinculado à sua conta.</p>
    </CardContent></Card>
  );

  const cards = [
    { label: "Enviados (mês)", value: kpis?.sentThisMonth ?? 0, icon: Package, fmt: (v: number) => String(v) },
    { label: "Reparos Concluídos", value: kpis?.completedRepairs ?? 0, icon: CheckCircle, fmt: (v: number) => String(v) },
    { label: "Pendentes", value: kpis?.pendingRepairs ?? 0, icon: Clock, fmt: (v: number) => String(v) },
    { label: "Total Comissões", value: kpis?.totalCommissions ?? 0, icon: DollarSign, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
    { label: "Comissões Pagas", value: kpis?.paidCommissions ?? 0, icon: Banknote, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
    { label: "Comissões Pendentes", value: kpis?.pendingCommissions ?? 0, icon: AlertCircle, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{cp?.name}</h1>
        <p className="text-muted-foreground">Painel do parceiro</p>
      </div>

      {kpiLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <c.icon className="h-3.5 w-3.5" /> {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-2xl font-bold">{c.fmt(c.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
