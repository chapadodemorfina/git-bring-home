import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Recycle, TrendingUp, Package, BarChart3 } from "lucide-react";
import { useScrapDashboard } from "../hooks/useScrapDisassembly";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const statusLabels: Record<string, string> = {
  aguardando_triagem: "Aguardando Triagem",
  triada: "Triada",
  desmontada: "Desmontada",
  pecas_recuperadas: "Peças Recuperadas",
  descartada: "Descartada",
  vendida: "Vendida",
  usada_internamente: "Usada Internamente",
};

const categoryLabels: Record<string, string> = {
  aparelho_completo: "Aparelho Completo",
  placa: "Placa",
  carcaca: "Carcaça",
  tela_quebrada: "Tela Quebrada",
  lote_pecas: "Lote de Peças",
  acessorio: "Acessório",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(142 76% 36%)",
  "hsl(0 84% 60%)",
];

export default function ScrapDashboardPage() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useScrapDashboard();

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando dashboard...</p>;

  const d = dashboard || {};

  const statusData = Object.entries(d.by_status || {}).map(([k, v]) => ({
    name: statusLabels[k] || k,
    value: v as number,
  }));

  const categoryData = Object.entries(d.by_category || {}).map(([k, v]) => ({
    name: categoryLabels[k] || k,
    value: v as number,
  }));

  const brandData = (d.by_brand || []).map((b: any) => ({
    name: b.brand,
    count: b.count,
  }));

  const topParts = (d.top_recovered_parts || []) as { name: string; total_qty: number }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/inventory/scrap")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Dashboard de Sucata
          </h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Recycle className="h-4 w-4" /> Total Sucatas
            </div>
            <p className="text-2xl font-bold mt-1">{d.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" /> Valor Estimado
            </div>
            <p className="text-2xl font-bold mt-1">{fmt.format(d.estimated_recovery || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Package className="h-4 w-4" /> Valor Recuperado
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{fmt.format(d.actual_recovery || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-muted-foreground text-sm">Taxa Recuperação</div>
            <p className="text-2xl font-bold mt-1">
              {d.estimated_recovery > 0
                ? `${Math.round(((d.actual_recovery || 0) / d.estimated_recovery) * 100)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Category chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por Categoria</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Brand chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por Marca</CardTitle></CardHeader>
          <CardContent>
            {brandData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={brandData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Top recovered parts */}
        <Card>
          <CardHeader><CardTitle className="text-base">Peças Mais Reaproveitadas</CardTitle></CardHeader>
          <CardContent>
            {topParts.length > 0 ? (
              <div className="space-y-2">
                {topParts.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{p.name}</span>
                    <Badge variant="secondary">{p.total_qty} un.</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Nenhuma peça recuperada ainda</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
