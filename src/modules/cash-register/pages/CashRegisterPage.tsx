import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useOpenCashRegister,
  useCashMovements,
  useCashRegisterSummary,
  useCashRegisterHistory,
  useOpenCashRegisterMutation,
  useCloseCashRegisterMutation,
  useAddCashMovement,
  movementTypeLabels,
  movementTypeColors,
  type CashMovementType,
  type CashRegister,
} from "../hooks/useCashRegister";
import { useAuth } from "@/contexts/AuthContext";
import { generateCashRegisterClosingPdf } from "@/lib/pdf-generators/cash-register-closing-pdf";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DataPagination from "@/components/ui/data-pagination";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, Lock, Unlock, ArrowDownCircle, ArrowUpCircle,
  Banknote, CreditCard, Smartphone, Receipt, TrendingDown,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, History,
  Loader2, Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CashRegisterPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("current");
  const [movPage, setMovPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [histFrom, setHistFrom] = useState("");
  const [histTo, setHistTo] = useState("");

  // Dialogs
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [movType, setMovType] = useState<CashMovementType>("withdrawal");
  const [showHistoryDetail, setShowHistoryDetail] = useState<CashRegister | null>(null);

  // Form
  const [initialAmount, setInitialAmount] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [movAmount, setMovAmount] = useState("");
  const [movDesc, setMovDesc] = useState("");
  const [movPayMethod, setMovPayMethod] = useState("cash");

  // Queries
  const { data: openRegister, isLoading: loadingRegister } = useOpenCashRegister();
  const { data: movements } = useCashMovements(openRegister?.id, movPage);
  const { data: summary } = useCashRegisterSummary(openRegister?.id);
  const { data: history } = useCashRegisterHistory(histPage, histFrom || null, histTo || null);

  // Mutations
  const openMut = useOpenCashRegisterMutation();
  const closeMut = useCloseCashRegisterMutation();
  const addMov = useAddCashMovement();

  const expectedBalance = openRegister
    ? Number(openRegister.initial_amount) + (summary?.total_in || 0) - (summary?.total_out || 0)
    : 0;

  const handleOpen = () => {
    openMut.mutate(
      { initial_amount: parseFloat(initialAmount) || 0, notes: openNotes || undefined },
      { onSuccess: () => { setShowOpen(false); setInitialAmount(""); setOpenNotes(""); } }
    );
  };

  const handleClose = () => {
    if (!openRegister) return;
    const registerSnapshot = { ...openRegister };
    const summarySnapshot = summary ? { ...summary } : null;
    closeMut.mutate(
      { register_id: openRegister.id, counted_amount: parseFloat(countedAmount) || 0, closing_notes: closeNotes || undefined },
      {
        onSuccess: async (result: any) => {
          setShowClose(false);
          setCountedAmount("");
          setCloseNotes("");
          // Auto-print closing report
          try {
            await printClosingReport(registerSnapshot.id, {
              ...registerSnapshot,
              closed_at: new Date().toISOString(),
              expected_amount: result?.expected_amount ?? null,
              counted_amount: result?.counted_amount ?? null,
              difference_amount: result?.difference ?? null,
              closing_notes: closeNotes || null,
            }, summarySnapshot);
          } catch { /* non-blocking */ }
        },
      }
    );
  };

  const handleAddMovement = () => {
    if (!openRegister) return;
    addMov.mutate(
      {
        cash_register_id: openRegister.id,
        movement_type: movType,
        payment_method: movPayMethod,
        amount: parseFloat(movAmount) || 0,
        description: movDesc,
      },
      { onSuccess: () => { setShowMovement(false); setMovAmount(""); setMovDesc(""); } }
    );
  };

  const openMovementDialog = (type: CashMovementType) => {
    setMovType(type);
    setMovPayMethod("cash");
    setMovAmount("");
    setMovDesc("");
    setShowMovement(true);
  };

  if (loadingRegister) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Caixa</h1>
          <p className="text-muted-foreground text-sm">Abertura, movimentações e fechamento diário</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="current">
            <Receipt className="h-4 w-4 mr-1" /> Caixa Atual
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {openRegister ? (
                    <>
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Unlock className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">Caixa Aberto</h2>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aberto</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Operador: <span className="font-medium">{openRegister.opened_by_name || "—"}</span> •
                          Abertura: {format(new Date(openRegister.opened_at), "dd/MM/yyyy HH:mm")} •
                          Valor inicial: <span className="font-medium">{fmt(Number(openRegister.initial_amount))}</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">Caixa Fechado</h2>
                        <p className="text-sm text-muted-foreground">Abra o caixa para iniciar as operações do dia</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!openRegister ? (
                    <Button onClick={() => setShowOpen(true)}>
                      <Unlock className="h-4 w-4 mr-2" /> Abrir Caixa
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => { setCountedAmount(""); setCloseNotes(""); setShowClose(true); }}>
                      <Lock className="h-4 w-4 mr-2" /> Fechar Caixa
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {openRegister && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <SummaryCard icon={<Banknote className="h-4 w-4" />} label="Dinheiro" value={fmt(summary?.cash_in || 0)} color="text-green-600" />
                <SummaryCard icon={<Smartphone className="h-4 w-4" />} label="PIX" value={fmt(summary?.pix_in || 0)} color="text-blue-600" />
                <SummaryCard icon={<CreditCard className="h-4 w-4" />} label="Crédito" value={fmt(summary?.credit_in || 0)} color="text-purple-600" />
                <SummaryCard icon={<CreditCard className="h-4 w-4" />} label="Débito" value={fmt(summary?.debit_in || 0)} color="text-indigo-600" />
                <SummaryCard icon={<TrendingDown className="h-4 w-4" />} label="Sangrias" value={fmt(summary?.withdrawals || 0)} color="text-red-600" />
                <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Reforços" value={fmt(summary?.reinforcements || 0)} color="text-teal-600" />
                <SummaryCard icon={<ArrowDownCircle className="h-4 w-4" />} label="Despesas" value={fmt(summary?.expenses || 0)} color="text-orange-600" />
                <SummaryCard icon={<DollarSign className="h-4 w-4" />} label="Saldo Esperado" value={fmt(expectedBalance)} color="text-primary font-bold" />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => openMovementDialog("withdrawal")}>
                  <TrendingDown className="h-4 w-4 mr-2 text-red-500" /> Sangria
                </Button>
                <Button variant="outline" onClick={() => openMovementDialog("reinforcement")}>
                  <TrendingUp className="h-4 w-4 mr-2 text-teal-500" /> Reforço
                </Button>
                <Button variant="outline" onClick={() => openMovementDialog("expense")}>
                  <ArrowDownCircle className="h-4 w-4 mr-2 text-orange-500" /> Despesa
                </Button>
                <Button variant="outline" onClick={() => openMovementDialog("receipt")}>
                  <ArrowUpCircle className="h-4 w-4 mr-2 text-blue-500" /> Recebimento
                </Button>
                <Button variant="outline" onClick={() => openMovementDialog("adjustment")}>
                  <DollarSign className="h-4 w-4 mr-2" /> Ajuste
                </Button>
              </div>

              {/* Movements Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Movimentações</CardTitle>
                </CardHeader>
                <CardContent>
                  {movements && movements.items.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Horário</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Usuário</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movements.items.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-sm">{format(new Date(m.created_at), "HH:mm")}</TableCell>
                              <TableCell>
                                <Badge className={cn("text-xs", movementTypeColors[m.movement_type])}>
                                  {movementTypeLabels[m.movement_type]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate">{m.description}</TableCell>
                              <TableCell className="text-sm capitalize">{paymentLabel(m.payment_method)}</TableCell>
                              <TableCell className={cn("text-right font-medium text-sm", Number(m.amount) >= 0 ? "text-green-600" : "text-red-600")}>
                                {Number(m.amount) >= 0 ? "+" : ""}{fmt(Number(m.amount))}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{m.created_by_name || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <DataPagination
                        page={movements.page}
                        pageSize={movements.pageSize}
                        total={movements.total}
                        onPageChange={setMovPage}
                      />
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma movimentação registrada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={histFrom} onChange={(e) => { setHistFrom(e.target.value); setHistPage(1); }} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={histTo} onChange={(e) => { setHistTo(e.target.value); setHistPage(1); }} className="w-40" />
            </div>
            {(histFrom || histTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setHistFrom(""); setHistTo(""); setHistPage(1); }}>Limpar</Button>
            )}
          </div>

          <Card>
            <CardContent className="pt-6">
              {history && history.items.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Operador</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor Inicial</TableHead>
                        <TableHead className="text-right">Esperado</TableHead>
                        <TableHead className="text-right">Contado</TableHead>
                        <TableHead className="text-right">Diferença</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.items.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{format(new Date(r.opened_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell className="text-sm">{r.opened_by_name || "—"}</TableCell>
                          <TableCell>
                            <Badge className={r.status === "open"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-muted text-muted-foreground"}>
                              {r.status === "open" ? "Aberto" : "Fechado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{fmt(Number(r.initial_amount))}</TableCell>
                          <TableCell className="text-right text-sm">{r.expected_amount != null ? fmt(Number(r.expected_amount)) : "—"}</TableCell>
                          <TableCell className="text-right text-sm">{r.counted_amount != null ? fmt(Number(r.counted_amount)) : "—"}</TableCell>
                          <TableCell className={cn("text-right text-sm font-medium",
                            r.difference_amount != null && Number(r.difference_amount) < 0 ? "text-red-600" :
                            r.difference_amount != null && Number(r.difference_amount) > 0 ? "text-green-600" : ""
                          )}>
                            {r.difference_amount != null ? (
                              <span className="flex items-center justify-end gap-1">
                                {Number(r.difference_amount) !== 0 && <AlertTriangle className="h-3 w-3" />}
                                {fmt(Number(r.difference_amount))}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => setShowHistoryDetail(r)}>
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <DataPagination
                    page={history.page}
                    pageSize={history.pageSize}
                    total={history.total}
                    onPageChange={setHistPage}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum registro encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Open Dialog ── */}
      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>Informe o saldo inicial para abrir o caixa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor Inicial (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0,00"
                className="text-lg"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={openNotes} onChange={(e) => setOpenNotes(e.target.value)} placeholder="Observações (opcional)" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowOpen(false)}>Cancelar</Button>
            <Button onClick={handleOpen} disabled={openMut.isPending}>
              {openMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Dialog ── */}
      <AlertDialog open={showClose} onOpenChange={setShowClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Caixa</AlertDialogTitle>
            <AlertDialogDescription>
              Saldo esperado: <span className="font-bold text-foreground">{fmt(expectedBalance)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor Contado (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={countedAmount}
                onChange={(e) => setCountedAmount(e.target.value)}
                placeholder="0,00"
                className="text-lg"
                autoFocus
              />
              {countedAmount && (
                <div className={cn("mt-2 p-2 rounded text-sm font-medium",
                  parseFloat(countedAmount) - expectedBalance === 0
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                )}>
                  Diferença: {fmt((parseFloat(countedAmount) || 0) - expectedBalance)}
                  {(parseFloat(countedAmount) || 0) - expectedBalance === 0 && (
                    <CheckCircle2 className="h-4 w-4 inline ml-2" />
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Observações de Fechamento</label>
              <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Observações (opcional)" rows={2} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={closeMut.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {closeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Movement Dialog ── */}
      <Dialog open={showMovement} onOpenChange={setShowMovement}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movType === "withdrawal" ? "Registrar Sangria" :
               movType === "reinforcement" ? "Registrar Reforço" :
               movType === "expense" ? "Registrar Despesa" :
               movType === "receipt" ? "Registrar Recebimento" : "Registrar Ajuste"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                placeholder="0,00"
                className="text-lg"
                autoFocus
              />
            </div>
            {["receipt", "adjustment"].includes(movType) && (
              <div>
                <label className="text-sm font-medium">Forma de Pagamento</label>
                <Select value={movPayMethod} onValueChange={setMovPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Descrição / Motivo</label>
              <Textarea value={movDesc} onChange={(e) => setMovDesc(e.target.value)} placeholder="Descreva o motivo..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMovement(false)}>Cancelar</Button>
            <Button onClick={handleAddMovement} disabled={addMov.isPending || !movDesc || !(parseFloat(movAmount) > 0)}>
              {addMov.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Detail Dialog ── */}
      <Dialog open={!!showHistoryDetail} onOpenChange={() => setShowHistoryDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Fechamento</DialogTitle>
          </DialogHeader>
          {showHistoryDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Abertura:</span> <span className="font-medium">{format(new Date(showHistoryDetail.opened_at), "dd/MM/yyyy HH:mm")}</span></div>
                <div><span className="text-muted-foreground">Fechamento:</span> <span className="font-medium">{showHistoryDetail.closed_at ? format(new Date(showHistoryDetail.closed_at), "dd/MM/yyyy HH:mm") : "—"}</span></div>
                <div><span className="text-muted-foreground">Operador:</span> <span className="font-medium">{showHistoryDetail.opened_by_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={showHistoryDetail.status === "open" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}>{showHistoryDetail.status === "open" ? "Aberto" : "Fechado"}</Badge></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Valor Inicial:</span> <span className="font-medium">{fmt(Number(showHistoryDetail.initial_amount))}</span></div>
                <div><span className="text-muted-foreground">Esperado:</span> <span className="font-medium">{showHistoryDetail.expected_amount != null ? fmt(Number(showHistoryDetail.expected_amount)) : "—"}</span></div>
                <div><span className="text-muted-foreground">Contado:</span> <span className="font-medium">{showHistoryDetail.counted_amount != null ? fmt(Number(showHistoryDetail.counted_amount)) : "—"}</span></div>
                <div>
                  <span className="text-muted-foreground">Diferença:</span>{" "}
                  <span className={cn("font-bold",
                    showHistoryDetail.difference_amount != null && Number(showHistoryDetail.difference_amount) < 0 ? "text-red-600" :
                    showHistoryDetail.difference_amount != null && Number(showHistoryDetail.difference_amount) > 0 ? "text-green-600" : ""
                  )}>
                    {showHistoryDetail.difference_amount != null ? fmt(Number(showHistoryDetail.difference_amount)) : "—"}
                  </span>
                </div>
              </div>
              {showHistoryDetail.notes && (
                <>
                  <Separator />
                  <div><span className="text-muted-foreground">Observações (abertura):</span> <p>{showHistoryDetail.notes}</p></div>
                </>
              )}
              {showHistoryDetail.closing_notes && (
                <div><span className="text-muted-foreground">Observações (fechamento):</span> <p>{showHistoryDetail.closing_notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className={color}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-sm font-semibold", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Dinheiro",
    pix: "PIX",
    credit_card: "Crédito",
    debit_card: "Débito",
  };
  return map[method] || method;
}
