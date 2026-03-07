import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts, useConsumePart, useRepairPartsUsed } from "../hooks/useInventory";
import { consumePartSchema, type ConsumePartFormData } from "../types";

interface Props {
  serviceOrderId: string;
}

export default function ConsumePartPanel({ serviceOrderId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const { data: products } = useProducts();
  const { data: partsUsed } = useRepairPartsUsed(serviceOrderId);
  const consumePart = useConsumePart();

  const form = useForm<ConsumePartFormData>({
    resolver: zodResolver(consumePartSchema),
    defaultValues: { product_id: "", quantity: 1, notes: "" },
  });

  const handleSubmit = async (data: ConsumePartFormData) => {
    await consumePart.mutateAsync({ serviceOrderId, values: data });
    form.reset();
    setShowForm(false);
  };

  const totalCost = partsUsed?.reduce((s, p) => s + p.total_cost, 0) || 0;
  const totalPrice = partsUsed?.reduce((s, p) => s + p.total_price, 0) || 0;
  const margin = totalPrice - totalCost;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Peças Utilizadas</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Consumir Peça</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="product_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peça *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {products?.filter(p => p.quantity > 0).map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.sku} — {p.name} (estoque: {p.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" disabled={consumePart.isPending}>{consumePart.isPending ? "Consumindo..." : "Confirmar"}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {partsUsed && partsUsed.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peça</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Total Custo</TableHead>
                <TableHead className="text-right">Total Preço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partsUsed.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{p.products?.sku} — {p.products?.name}</TableCell>
                  <TableCell className="text-right">{p.quantity}</TableCell>
                  <TableCell className="text-right">R$ {p.unit_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {p.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {p.total_cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {p.total_price.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Card>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Margem estimada de peças:</span>
              </div>
              <div className="flex gap-4 text-sm font-medium">
                <span>Custo: <span className="text-destructive">R$ {totalCost.toFixed(2)}</span></span>
                <span>Preço: <span className="text-primary">R$ {totalPrice.toFixed(2)}</span></span>
                <Badge variant={margin >= 0 ? "default" : "destructive"}>Margem: R$ {margin.toFixed(2)}</Badge>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-2">Nenhuma peça consumida nesta OS.</p>
      )}
    </div>
  );
}
