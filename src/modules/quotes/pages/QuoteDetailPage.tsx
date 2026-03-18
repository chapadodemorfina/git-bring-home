import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCommercialQuote, useQuoteItems, useAddQuoteItem, useDeleteQuoteItem,
  useChangeQuoteStatus, useQuoteHistory, useDuplicateQuote,
} from "../hooks/useQuotes";
import {
  quoteStatusLabels, quoteStatusColors, itemTypeLabels,
  quoteItemFormSchema, QuoteItemFormData, CommercialQuoteStatus, QuoteItemType,
} from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Plus, Trash2, Send, CheckCircle, XCircle, Copy,
  Pencil, Wrench, Package, Zap, Clock, FileText, FileDown,
} from "lucide-react";
import { format } from "date-fns";
import { generateQuotePdf } from "@/lib/pdf-generators/quote-pdf";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companySettings = useCompanySettings();
  const { data: quote, isLoading } = useCommercialQuote(id);
  const { data: items } = useQuoteItems(id);
  const { data: history } = useQuoteHistory(id);
  const addItem = useAddQuoteItem();
  const deleteItem = useDeleteQuoteItem();
  const changeStatus = useChangeQuoteStatus();
  const duplicateQuote = useDuplicateQuote();
  const [addOpen, setAddOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const form = useForm<QuoteItemFormData>({
    resolver: zodResolver(quoteItemFormSchema),
    defaultValues: { item_type: "service", description: "", quantity: 1, unit_cost: 0, unit_price: 0 },
  });

  if (isLoading) return <p className="p-8 text-muted-foreground">Carregando...</p>;
  if (!quote) return <p className="p-8 text-destructive">Orçamento não encontrado.</p>;

  const isDraft = quote.status === "draft";
  const canApprove = quote.status === "draft" || quote.status === "sent";

  const handleAddItem = async (data: QuoteItemFormData) => {
    await addItem.mutateAsync({ quoteId: id!, data });
    setAddOpen(false);
    form.reset();
  };

  const handleReject = async () => {
    await changeStatus.mutateAsync({ id: id!, status: "rejected", reason: rejectReason });
    setRejectOpen(false);
    setRejectReason("");
  };

  const handleExportPdf = () => {
    if (!quote || !items) return;
    const cs = companySettings;
    const laborCost = items.filter(i => i.item_type === "labor").reduce((s, i) => s + Number(i.total_price), 0);
    const partsCost = items.filter(i => i.item_type === "part").reduce((s, i) => s + Number(i.total_price), 0);
    generateQuotePdf(
      {
        quote_number: quote.quote_number,
        status: quote.status,
        total_amount: Number(quote.total_amount),
        labor_cost: laborCost,
        parts_cost: partsCost,
        analysis_fee: 0,
        expires_at: quote.valid_until,
        notes: quote.description || null,
        created_at: quote.created_at,
        order_number: quote.service_orders?.order_number,
        customer_name: quote.customers?.full_name,
        device_label: undefined,
      },
      items.map(i => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price),
        item_type: i.item_type,
      })),
      {
        name: cs.company_name, cnpj: cs.company_cnpj, address: cs.company_address,
        phone: cs.company_phone, email: cs.company_email, logoUrl: cs.company_logo_url,
      }
    );
  };

  const partItems = items?.filter((i) => i.item_type === "part") || [];
  const laborItems = items?.filter((i) => i.item_type === "labor") || [];
  const otherItems = items?.filter((i) => i.item_type === "service" || i.item_type === "other") || [];

  const renderItemGroup = (list: typeof items, icon: React.ReactNode, label: string) => {
    if (!list?.length) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-16 text-right">Qtd</TableHead>
              <TableHead className="w-24 text-right">Custo</TableHead>
              <TableHead className="w-24 text-right">Preço</TableHead>
              <TableHead className="w-24 text-right">Total</TableHead>
              <TableHead className="w-24 text-right">Lucro</TableHead>
              {isDraft && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmt(Number(item.unit_cost))}</TableCell>
                <TableCell className="text-right">{fmt(Number(item.unit_price))}</TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(item.total_price))}</TableCell>
                <TableCell className="text-right text-green-600">{fmt(Number(item.profit_amount))}</TableCell>
                {isDraft && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => deleteItem.mutate({ id: item.id, quoteId: id! })}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{quote.quote_number}</h1>
              <Badge className={quoteStatusColors[quote.status as CommercialQuoteStatus]}>
                {quoteStatusLabels[quote.status as CommercialQuoteStatus]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{quote.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/quotes/${id}/edit`)}>
                <Pencil className="mr-1 h-4 w-4" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Item
              </Button>
              <Button size="sm" onClick={() => changeStatus.mutate({ id: id!, status: "sent" })}>
                <Send className="mr-1 h-4 w-4" /> Enviar
              </Button>
            </>
          )}
          {canApprove && (
            <>
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700"
                onClick={() => changeStatus.mutate({ id: id!, status: "approved" })}>
                <CheckCircle className="mr-1 h-4 w-4" /> Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="mr-1 h-4 w-4" /> Recusar
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileDown className="mr-1 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            const r = await duplicateQuote.mutateAsync(id!);
            navigate(`/quotes/${r.id}`);
          }}>
            <Copy className="mr-1 h-4 w-4" /> Duplicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info Card */}
          <Card>
            <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground block">Cliente</span><span className="font-medium">{quote.customers?.full_name || "—"}</span></div>
              <div><span className="text-muted-foreground block">OS Vinculada</span><span className="font-medium">{quote.service_orders?.order_number || "—"}</span></div>
              <div><span className="text-muted-foreground block">Validade</span><span className="font-medium">{quote.valid_until ? format(new Date(quote.valid_until), "dd/MM/yyyy") : "—"}</span></div>
              <div><span className="text-muted-foreground block">Criado em</span><span className="font-medium">{format(new Date(quote.created_at), "dd/MM/yyyy HH:mm")}</span></div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Itens do Orçamento</CardTitle>
              {isDraft && (
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Item
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!items?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item adicionado.</p>
              ) : (
                <>
                  {renderItemGroup(partItems, <Package className="h-4 w-4 text-muted-foreground" />, "Peças")}
                  {renderItemGroup(laborItems, <Wrench className="h-4 w-4 text-muted-foreground" />, "Mão de Obra")}
                  {renderItemGroup(otherItems, <Zap className="h-4 w-4 text-muted-foreground" />, "Serviços / Outros")}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Totals */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Peças</span><span>{fmt(Number(quote.subtotal_parts))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mão de Obra</span><span>{fmt(Number(quote.subtotal_labor))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outros</span><span>{fmt(Number(quote.subtotal_other))}</span></div>
              {Number(quote.discount_amount) > 0 && (
                <div className="flex justify-between text-destructive"><span>Desconto</span><span>-{fmt(Number(quote.discount_amount))}</span></div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmt(Number(quote.total_amount))}</span></div>
              <Separator />
              <div className="flex justify-between text-muted-foreground"><span>Custo Total</span><span>{fmt(Number(quote.total_cost))}</span></div>
              <div className="flex justify-between text-green-600 font-medium"><span>Lucro Estimado</span><span>{fmt(Number(quote.estimated_profit))}</span></div>
            </CardContent>
          </Card>

          {/* Rejection info */}
          {quote.rejection_reason && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-destructive mb-1">Motivo da Recusa</p>
                <p className="text-sm">{quote.rejection_reason}</p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              {!history?.length ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{h.action}</p>
                        {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(h.created_at), "dd/MM/yy HH:mm")}
                          {h.profiles?.full_name && ` • ${h.profiles.full_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Item</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddItem)} className="space-y-4">
              <FormField control={form.control} name="item_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(itemTypeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Input placeholder="Ex: Tela LCD iPhone 15" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit_cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit_price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={addItem.isPending}>Adicionar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Motivo da recusa..." value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={changeStatus.isPending}>Recusar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
