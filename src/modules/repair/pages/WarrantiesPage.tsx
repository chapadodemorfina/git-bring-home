import { useState } from "react";
import { useWarrantyAnalytics, useWarrantiesPaginated, useVoidWarranty } from "../hooks/useWarrantyAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import DataPagination from "@/components/ui/data-pagination";
import { Shield, ShieldCheck, ShieldX, AlertTriangle, RotateCcw, BarChart3, Search, Eye, Clock, Users } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { warrantyTypeLabels } from "../types";

const defaultAnalytics = {
  total_warranties: 0, active_warranties: 0, expired_warranties: 0, voided_warranties: 0,
  total_returns: 0, open_returns: 0, return_rate: 0, expiring_soon: 0,
  returns_by_cause: [], returns_by_outcome: [], top_returning_devices: [],
  returns_by_technician: [], recent_returns: [],
};

export default function WarrantiesPage() {
  const { data: rawAnalytics, isLoading: analyticsLoading, error: analyticsError } = useWarrantyAnalytics();
  const voidWarranty = useVoidWarranty();
  const [voidOpen, setVoidOpen] = useState(false);
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data: warrantiesData, isLoading } = useWarrantiesPaginated(search, page, statusFilter, typeFilter);
  const warranties = warrantiesData?.items || [];
  const total = warrantiesData?.total || 0;
  const analytics = { ...defaultAnalytics, ...rawAnalytics };

  const handleVoid = async () => {
    if (!selectedWarrantyId || !voidReason.trim()) return;
    await voidWarranty.mutateAsync({ warrantyId: selectedWarrantyId, reason: voidReason.trim() });
    setVoidOpen(false);
    setVoidReason("");
    setSelectedWarrantyId(null);
  };

  const getStatusBadge = (w: any) => {
    if (w.is_void) return <Badge variant="destructive">Anulada</Badge>;
    if (isPast(new Date(w.end_date))) return <Badge className="bg-muted text-muted-foreground">Expirada</Badge>;
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativa</Badge>;
  };

  if (analyticsLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  if (analyticsError) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-medium">Erro ao carregar dados de garantia</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Garantias</h1>
          <p className="text-muted-foreground">Gestão e análise de garantias de reparo</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/warranties/returns"><RotateCcw className="mr-2 h-4 w-4" />Retornos</Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{analytics.total_warranties}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-500" />Ativas</p><p className="text-2xl font-bold text-green-600">{analytics.active_warranties}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4 text-amber-500" />Expiradas</p><p className="text-2xl font-bold text-amber-600">{analytics.expired_warranties}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><ShieldX className="h-4 w-4 text-destructive" />Anuladas</p><p className="text-2xl font-bold text-destructive">{analytics.voided_warranties}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-1"><RotateCcw className="h-4 w-4" />Retornos Abertos</p><p className="text-2xl font-bold">{analytics.open_returns}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Taxa Retorno</p><p className="text-2xl font-bold">{analytics.return_rate ?? 0}%</p></CardContent></Card>
      </div>

      {analytics.expiring_soon > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {analytics.expiring_soon} garantia(s) vencendo nos próximos 30 dias
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><Shield className="mr-1 h-4 w-4" />Garantias</TabsTrigger>
          <TabsTrigger value="returns"><RotateCcw className="mr-1 h-4 w-4" />Retornos Recentes</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="mr-1 h-4 w-4" />Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nº garantia..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="expired">Expiradas</SelectItem>
                    <SelectItem value="voided">Anuladas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="part">Peças</SelectItem>
                    <SelectItem value="mixed">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <>
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
                      {warranties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhuma garantia encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        warranties.map((w: any) => (
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
                                {warrantyTypeLabels[w.warranty_type] || w.warranty_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(w.start_date), "dd/MM/yy", { locale: ptBR })} → {format(new Date(w.end_date), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{getStatusBadge(w)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" asChild>
                                  <Link to={`/warranties/${w.id}`}><Eye className="h-4 w-4" /></Link>
                                </Button>
                                {!w.is_void && !isPast(new Date(w.end_date)) && (
                                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setSelectedWarrantyId(w.id); setVoidOpen(true); }}>
                                    Anular
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <div className="px-4">
                    <DataPagination page={page} pageSize={warrantiesData?.pageSize || 25} total={total} onPageChange={setPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Retornos Recentes</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/warranties/returns">Ver todos</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Causa</TableHead>
                    <TableHead>Cobertura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics.recent_returns || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.warranty_number}</TableCell>
                      <TableCell className="text-sm">{r.customer_name}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.return_cause || "—"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.outcome || "pendente"}</Badge></TableCell>
                      <TableCell><Badge variant={r.status === "open" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(r.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                  {!(analytics.recent_returns || []).length && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum retorno registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {(analytics.returns_by_cause || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Retornos por Causa</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.returns_by_cause.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{c.cause}</span>
                        <Badge variant="secondary">{c.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(analytics.returns_by_technician || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Retornos por Técnico</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.returns_by_technician.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{t.technician}</span>
                        <Badge variant="secondary">{t.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(analytics.top_returning_devices || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Dispositivos com Mais Retornos</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.top_returning_devices.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{d.device}</span>
                        <Badge variant="secondary">{d.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(analytics.returns_by_outcome || []).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Resultados dos Retornos</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.returns_by_outcome.map((o: any, i: number) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-sm">{o.outcome}</span>
                        <Badge variant="secondary">{o.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {!(analytics.returns_by_cause || []).length && !(analytics.top_returning_devices || []).length && !(analytics.returns_by_outcome || []).length && (
              <Card className="lg:col-span-2">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum dado de análise disponível ainda</p>
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
              <Textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} placeholder="Descreva o motivo para anular esta garantia..." />
            </div>
            <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason.trim() || voidWarranty.isPending}>Anular Garantia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
