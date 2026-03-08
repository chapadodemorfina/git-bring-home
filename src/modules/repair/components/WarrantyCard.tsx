import { useState } from "react";
import { useWarranty, useCreateWarranty, useWarrantyReturns, useCreateWarrantyReturn } from "../hooks/useRepair";
import { useRepairTests } from "../hooks/useRepair";
import { useVoidWarranty } from "../hooks/useWarrantyAnalytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldX, RotateCcw, ExternalLink, Ban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const returnCauses = [
  { value: "same_issue", label: "Mesmo defeito" },
  { value: "different_issue", label: "Defeito diferente" },
  { value: "misuse", label: "Mau uso" },
  { value: "water_damage", label: "Dano por líquido" },
  { value: "physical_damage", label: "Dano físico" },
];

interface Props {
  serviceOrderId: string;
  orderStatus: string;
}

export default function WarrantyCard({ serviceOrderId, orderStatus }: Props) {
  const { data: warranty, isLoading } = useWarranty(serviceOrderId);
  const { data: tests } = useRepairTests(serviceOrderId);
  const createWarranty = useCreateWarranty();
  const { data: returns } = useWarrantyReturns(warranty?.id);
  const createReturn = useCreateWarrantyReturn();
  const voidWarranty = useVoidWarranty();
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnCause, setReturnCause] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const canGenerate = orderStatus === "delivered" && !warranty;
  const allTestsPassed = tests?.length ? tests.every((t) => t.passed === true) : false;

  const isActive = warranty && !warranty.is_void && new Date(warranty.end_date) >= new Date();
  const isExpired = warranty && !warranty.is_void && new Date(warranty.end_date) < new Date();

  const handleGenerate = () => {
    createWarranty.mutate({ serviceOrderId });
  };

  const handleReturn = async () => {
    if (!warranty || !returnReason.trim()) return;
    await createReturn.mutateAsync({
      warrantyId: warranty.id,
      originalServiceOrderId: serviceOrderId,
      reason: returnReason.trim(),
    });
    setReturnOpen(false);
    setReturnReason("");
    setReturnCause("");
  };

  const handleVoid = async () => {
    if (!warranty || !voidReason.trim()) return;
    await voidWarranty.mutateAsync({ warrantyId: warranty.id, reason: voidReason.trim() });
    setVoidOpen(false);
    setVoidReason("");
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Garantia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!warranty ? (
          <div className="text-center py-4">
            {canGenerate ? (
              <>
                {!allTestsPassed && tests && tests.length > 0 && (
                  <p className="text-sm text-orange-600 mb-2">⚠ Nem todos os testes foram aprovados.</p>
                )}
                <Button onClick={handleGenerate} disabled={createWarranty.isPending}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Gerar Garantia
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {orderStatus !== "delivered" ? "A garantia será gerada automaticamente após a entrega." : "Nenhuma garantia registrada."}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold">{warranty.warranty_number}</span>
              {warranty.is_void ? (
                <Badge variant="destructive">Anulada</Badge>
              ) : isActive ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ativa</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Expirada</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">{format(new Date(warranty.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validade</p>
                <p className="font-medium">{format(new Date(warranty.end_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </div>

            {warranty.coverage_description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cobertura</p>
                <p className="text-sm">{warranty.coverage_description}</p>
              </div>
            )}

            {warranty.terms && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Termos</p>
                <p className="text-xs whitespace-pre-line bg-muted p-2 rounded">{warranty.terms}</p>
              </div>
            )}

            {(warranty as any).void_reason && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Motivo Anulação</p>
                <p className="text-xs bg-destructive/10 text-destructive p-2 rounded">{(warranty as any).void_reason}</p>
              </div>
            )}

            <div className="flex gap-2">
              {isActive && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Registrar Retorno
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setVoidOpen(true)}>
                    <Ban className="mr-1 h-4 w-4" /> Anular
                  </Button>
                </>
              )}
            </div>

            {/* Return history */}
            {returns && returns.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Retornos de Garantia</p>
                {returns.map((r) => (
                  <div key={r.id} className="p-2 rounded bg-muted/50 text-sm">
                    <p>{r.reason}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{r.status}</Badge>
                      {r.new_service_order_id && (
                        <Link to={`/service-orders/${r.new_service_order_id}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                          Nova OS <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                    {returnCauses.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motivo do Retorno</Label>
                <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={3}
                  placeholder="Descreva o problema que motivou o retorno..." />
              </div>
              <p className="text-xs text-muted-foreground">Uma nova OS será criada automaticamente vinculada a esta garantia.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancelar</Button>
              <Button onClick={handleReturn} disabled={!returnReason.trim() || createReturn.isPending}>
                Registrar Retorno
              </Button>
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
                <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3}
                  placeholder="Descreva o motivo para anular esta garantia..." />
              </div>
              <p className="text-xs text-destructive">Esta ação não pode ser desfeita.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleVoid} disabled={!voidReason.trim() || voidWarranty.isPending}>
                Anular Garantia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
