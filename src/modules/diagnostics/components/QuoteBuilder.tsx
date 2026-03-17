import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RepairQuote, RepairQuoteItem, QuoteItemFormData, quoteItemSchema,
  quoteStatusLabels, quoteStatusColors, itemTypeLabels, QuoteItemType,
} from "../types";
import { useQuoteItems, useAddQuoteItem, useDeleteQuoteItem, useUpdateQuote } from "../hooks/useDiagnostics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Wrench, Package, FileDown } from "lucide-react";
import { generateQuotePdf } from "@/lib/pdf-generators/quote-pdf";
import { useCompanyName } from "@/hooks/useCompanyName";

interface Props {
  quote: RepairQuote;
}

export default function QuoteBuilder({ quote }: Props) {
  const companyName = useCompanyName("i9 Solutions");
  const { data: items, isLoading } = useQuoteItems(quote.id);
  const addItem = useAddQuoteItem();
  const deleteItem = useDeleteQuoteItem();
  const updateQuote = useUpdateQuote();
  const [addOpen, setAddOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(false);

  const form = useForm<QuoteItemFormData>({
    resolver: zodResolver(quoteItemSchema),
    defaultValues: { item_type: "labor", description: "", quantity: 1, unit_price: 0 },
  });

  const handleAddItem = async (data: QuoteItemFormData) => {
    await addItem.mutateAsync({ quoteId: quote.id, data });
    setAddOpen(false);
    form.reset();
  };

  const laborItems = items?.filter((i) => i.item_type === "labor") || [];
  const partItems = items?.filter((i) => i.item_type === "part") || [];
  const subtotal = items?.reduce((sum, i) => sum + Number(i.total_price), 0) || 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const renderItems = (list: RepairQuoteItem[], icon: React.ReactNode, label: string) => (
    <>
      {list.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="font-medium text-sm">{label}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-20 text-right">Qtd</TableHead>
                <TableHead className="w-28 text-right">Unit.</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(item.total_price))}</TableCell>
                  <TableCell>
                    {quote.status === "draft" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => deleteItem.mutate({ id: item.id, quoteId: quote.id })}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="font-mono">{quote.quote_number}</CardTitle>
          <Badge className={quoteStatusColors[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
        </div>
        {quote.status === "draft" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Item
            </Button>
            <Button size="sm" onClick={() => updateQuote.mutate({ id: quote.id, data: { status: "sent" as any } })}>
              Enviar ao Cliente
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando itens...</p>
        ) : !items?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda.</p>
        ) : (
          <>
            {renderItems(laborItems, <Wrench className="h-4 w-4 text-muted-foreground" />, "Mão de Obra")}
            {renderItems(partItems, <Package className="h-4 w-4 text-muted-foreground" />, "Peças / Materiais")}

            <Separator className="my-4" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {Number(quote.discount_percent) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Desconto ({quote.discount_percent}%)</span>
                  <span>-{formatCurrency(subtotal * Number(quote.discount_percent) / 100)}</span>
                </div>
              )}
              {Number(quote.discount_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Desconto fixo</span>
                  <span>-{formatCurrency(Number(quote.discount_amount))}</span>
                </div>
              )}
              {Number(quote.analysis_fee) > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de Análise</span>
                  <span>{formatCurrency(Number(quote.analysis_fee))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span>{formatCurrency(Number(quote.total_amount))}</span>
              </div>
            </div>
          </>
        )}

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
                    <FormControl><Input placeholder="Ex: Troca de tela LCD" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="unit_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço Unitário (R$)</FormLabel>
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
      </CardContent>
    </Card>
  );
}
