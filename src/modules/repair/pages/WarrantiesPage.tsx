import { useState, useMemo } from "react";
import { useWarrantyAnalytics, useAllWarranties, useVoidWarranty } from "../hooks/useWarrantyAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ShieldCheck, ShieldX, AlertTriangle, RotateCcw, BarChart3, Search } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function WarrantiesPage() {
  const { data: analytics, isLoading: analyticsLoading } = useWarrantyAnalytics();
  const { data: warranties, isLoading } = useAllWarranties();
  const voidWarranty = useVoidWarranty();
  const [voidOpen, setVoidOpen] = useState(false);
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [search, setSearch] = useState("");

  const handleVoid = async () => {
    if (!selectedWarrantyId || !voidReason.trim()) return;
    await voidWarranty.mutateAsync({ warrantyId: selectedWarrantyId, reason: voidReason.trim() });
    setVoidOpen(false);
    setVoidReason("");
    setSelectedWarrantyId(null);
  };

  const getStatusBadge = (w: any) => {
    if (w.is_void) return <Badge variant="destructive">Anulada</Badge>;
    if (isPast(new Date(w.end_date))) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Expirada</Badge>;
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativa</Badge>;
  };
  const filteredWarranties = useMemo(() => {
    if (!warranties || !search) return warranties;
    const lower = search.toLowerCase();
    return warranties.filter((w: any) =>
      w.warranty_number?.toLowerCase().includes(lower) ||
      w.service_orders?.order_number?.toLowerCase().includes(lower) ||
      w.service_orders?.customers?.full_name?.toLowerCase().includes(lower) ||
      `${w.service_orders?.devices?.brand || ""} ${w.service_orders?.devices?.model || ""}`.toLowerCase().includes(lower)
    );
  }, [warranties, search]);

  if (isLoading || analyticsLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garantias</h1>
        <p className="text-muted-foreground">Gestão e análise de garantias de reparo</p>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{analytics.total_warranties}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-500" /> Ativas</p><p className="text-2xl font-bold text-green-600">{analytics.active_warranties}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-500" /> Expiradas</p><p className="text-2xl font-bold text-amber-600">{analytics.expired_warranties}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><ShieldX className="h-4 w-4 text-destructive" /> Anuladas</p><p className="text-2xl font-bold text-destructive">{analytics.voided_warranties}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Taxa Retorno</p><p className="text-2xl font-bold">{analytics.return_rate}%</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><Shield className="mr-1 h-4 w-4" /> Garantias</TabsTrigger>
          <TabsTrigger value="returns"><RotateCcw className="mr-1 h-4 w-4" /> Retornos</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="mr-1 h-4 w-4" /> Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nº garantia, OS, cliente, dispositivo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Garantia</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarranties?.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-sm">{w.warranty_number}</TableCell>
                      <TableCell>
                        <Link to={`/service-orders/${w.service_order_id}`} className="text-primary hover:underline text-sm">
                          {w.service_orders?.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{w.service_orders?.customers?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {w.service_orders?.devices ? `${w.service_orders.devices.brand || ""} ${w.service_orders.devices.model || ""}`.trim() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {w.warranty_type === "parts_warranty" ? "Peças" : w.warranty_type === "manufacturer_warranty" ? "Fabricante" : "Reparo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(w.start_date), "dd/MM/yy", { locale: ptBR })} → {format(new Date(w.end_date), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(w)}</TableCell>
                      <TableCell>
                        {!w.is_void && !isPast(new Date(w.end_date)) && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setSelectedWarrantyId(w.id); setVoidOpen(true); }}>
                            Anular
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Retornos Recentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Causa</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.recent_returns?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.warranty_number}</TableCell>
                      <TableCell className="text-sm">{r.customer_name}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.return_cause || "—"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.outcome || "pendente"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(r.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                  {(!analytics?.recent_returns?.length) && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum retorno registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {analytics?.returns_by_cause && analytics.returns_by_cause.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Retornos por Causa</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.returns_by_cause.map((c, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{c.cause}</span>
                        <Badge variant="secondary">{c.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {analytics?.top_returning_devices && analytics.top_returning_devices.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Dispositivos com Mais Retornos</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.top_returning_devices.map((d, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{d.device}</span>
                        <Badge variant="secondary">{d.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {analytics?.returns_by_outcome && analytics.returns_by_outcome.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Resultados dos Retornos</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.returns_by_outcome.map((o, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{o.outcome}</span>
                        <Badge variant="secondary">{o.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Void Dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anular Garantia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Anulação</Label>
              <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3}
                placeholder="Descreva o motivo para anular esta garantia..." />
            </div>
            <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita. A garantia será marcada como anulada permanentemente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason.trim() || voidWarranty.isPending}>
              Anular Garantia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
