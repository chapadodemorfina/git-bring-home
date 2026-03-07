import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useProducts, useAddStockEntry } from "../hooks/useInventory";
import { stockEntrySchema, type StockEntryFormData } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProductId?: string;
}

export default function StockEntryDialog({ open, onOpenChange, preselectedProductId }: Props) {
  const { data: products } = useProducts();
  const addEntry = useAddStockEntry();
  const form = useForm<StockEntryFormData>({
    resolver: zodResolver(stockEntrySchema),
    defaultValues: { product_id: preselectedProductId || "", quantity: 1, unit_cost: 0, notes: "" },
  });

  const handleSubmit = async (data: StockEntryFormData) => {
    await addEntry.mutateAsync(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Entrada de Estoque</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="product_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Produto *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unit_cost" render={({ field }) => (
                <FormItem><FormLabel>Custo Unitário</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end">
              <Button type="submit" disabled={addEntry.isPending}>{addEntry.isPending ? "Registrando..." : "Registrar Entrada"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
