import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useWarrantyDetail, useWarrantyItems, useVoidWarranty } from "../hooks/useWarrantyAnalytics";
import { useWarrantyReturns, useCreateWarrantyReturn } from "../hooks/useRepair";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ShieldCheck, ShieldX, RotateCcw, ExternalLink, Ban, ArrowLeft, Package, Wrench } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { warrantyTypeLabels, returnCauses, returnStatusLabels, returnOutcomeLabels } from "../types";

export default function WarrantyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: warranty, isLoading } = useWarrantyDetail(id);
  const { data: items } = useWarrantyItems(id);
  const { data: returns } = useWarrantyReturns(id);
  const voidWarranty = useVoidWarranty();
  const createReturn = useCreateWarrantyReturn();
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnCause, setReturnCause] = useState("");

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!warranty) return <p className="text-muted-foreground">Garantia não encontrada.</p>;

  const isActive = !warranty.is_void && !isPast(new Date(warranty.end_date));
  const isExpired = !warranty.is_void && isPast(new Date(warranty.end_date));
  const so = warranty.service_orders;

  const handleVoid = async () => {
    if (!voidReason.trim()) return;
    await voidWarranty.mutateAsync({ warrantyId: warranty.id, reason: voidReason.trim() });
    setVoidOpen(false);
    setVoidReason("");
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) return;
    await createReturn.mutateAsync({
      warrantyId: warranty.id,
      originalServiceOrderId: warranty.service_order_id,
      reason: returnReason.trim(),
    });
    setReturnOpen(false);
    setReturnReason("");
    setReturnCause("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link to="/warranties"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" /> {warranty.warranty_number}
          </h1>
          <p className="text-muted-foreground">{warranty.coverage_description}</p>
        </div>
        {warranty.is_void ? (
          <Badge variant="destructive" className="text-sm px-3 py-1">Anulada</Badge>
        ) : isActive ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-3 py-1">Ativa</Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground text-sm px-3 py-1">Expirada</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dados da Garantia</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium">{warrantyTypeLabels[warranty.warranty_type] || warranty.warranty_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">{format(new Date(warranty.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validade</p>
                <p className="font-medium">{format(new Date(warranty.end_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              {so?.customers && (
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{so.customers.full_name}</p>
                </div>
              )}
              {so && (
                <div>
                  <p className="text-xs text-muted-foreground">Ordem de Serviço</p>
                  <Link to={`/service-orders/${warranty.service_order_id}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                    {so.order_number} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {so?.devices && (
                <div>
                  <p className="text-xs text-muted-foreground">Dispositivo</p>
                  <p className="font-medium">{`${so.devices.brand || ""} ${so.devices.model || ""}`.trim()}</p>
                </div>
              )}
            </div>

            {warranty.terms && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1">Termos</p>
                <p className="text-sm bg-muted p-3 rounded whitespace-pre-line">{warranty.terms}</p>
              </div>
            )}

            {warranty.void_reason && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1">Motivo da Anulação</p>
                <p className="text-sm bg-destructive/10 text-destructive p-3 rounded">{warranty.void_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isActive && (
              <>
                <Button className="w-full" variant="outline" onClick={() => setReturnOpen(true)}>
                  <RotateCcw className="mr-2 h-4 w-4" />Registrar Retorno
                </Button>
                <Button className="w-full text-destructive" variant="ghost" onClick={() => setVoidOpen(true)}>
                  <Ban className="mr-2 h-4 w-4" />Anular Garantia
                </Button>
              </>
            )}
            {!isActive && !warranty.is_void && (
              <p className="text-sm text-muted-foreground text-center">Garantia expirada — ações indisponíveis</p>
            )}
            {warranty.is_void && (
              <p className="text-sm text-destructive text-center">Garantia anulada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warranty Items */}
      {items && items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Itens Cobertos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.item_type === "part" ? <><Package className="mr-1 h-3 w-3" />Peça</> : <><Wrench className="mr-1 h-3 w-3" />Serviço</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell className="text-sm">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Returns */}
      {returns && returns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Retornos de Garantia ({returns.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Causa</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nova OS</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.return_cause || "—"}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{returnOutcomeLabels[r.outcome] || r.outcome || "pendente"}</Badge></TableCell>
                    <TableCell><Badge variant={r.status === "open" ? "default" : "secondary"}>{returnStatusLabels[r.status] || r.status}</Badge></TableCell>
                    <TableCell>
                      {r.new_service_order_id ? (
                        <Link to={`/service-orders/${r.new_service_order_id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          Ver OS <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(r.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Retorno de Garantia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Causa do Retorno</Label>
              <Select value={returnCause} onValueChange={setReturnCause}>
                <SelectTrigger><SelectValue placeholder="Selecione a causa" /></SelectTrigger>
                <SelectContent>
                  {returnCauses.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo do Retorno</Label>
              <Textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} rows={3} placeholder="Descreva o problema..." />
            </div>
            <p className="text-xs text-muted-foreground">Uma nova OS será criada automaticamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancelar</Button>
            <Button onClick={handleReturn} disabled={!returnReason.trim() || createReturn.isPending}>Registrar Retorno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anular Garantia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Anulação</Label>
              <Textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} placeholder="Descreva o motivo..." />
            </div>
            <p className="text-xs text-destructive">Esta ação não pode ser desfeita.</p>
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
