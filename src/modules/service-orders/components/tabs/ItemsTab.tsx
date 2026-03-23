import { useState } from "react";
import {
  useServiceOrderItems,
  useAddSOItem,
  useUpdateSOItem,
  useDeleteSOItem,
  itemTypeLabels,
  type SOItemType,
  type SOItemFormData,
  type ServiceOrderItem,
} from "../../hooks/useServiceOrderItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Package, Wrench, HardHat, ShoppingCart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAllProducts } from "@/modules/inventory/hooks/useInventory";
import { ProductCombobox } from "@/components/ui/product-combobox";

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const typeIcons: Record<SOItemType, React.ReactNode> = {
  service: <Wrench className="h-3.5 w-3.5" />,
  product: <Package className="h-3.5 w-3.5" />,
  labor: <HardHat className="h-3.5 w-3.5" />,
};

const typeColors: Record<SOItemType, string> = {
  service: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  product: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  labor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

interface Props {
  serviceOrderId: string;
}

const emptyForm: SOItemFormData = {
  item_type: "service",
  description: "",
  quantity: 1,
  unit_price: 0,
  notes: null,
};

export default function ItemsTab({ serviceOrderId }: Props) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useServiceOrderItems(serviceOrderId);
  const addMutation = useAddSOItem();
  const updateMutation = useUpdateSOItem();
  const deleteMutation = useDeleteSOItem();
  const { data: products } = useAllProducts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceOrderItem | null>(null);
  const [form, setForm] = useState<SOItemFormData>(emptyForm);

  const total = items?.reduce((s, i) => s + Number(i.total_price), 0) ?? 0;

  const invalidateOsTotal = () => {
    // Invalidate the service order query to refresh total_amount from DB
    qc.invalidateQueries({ queryKey: ["service-order", serviceOrderId] });
    qc.invalidateQueries({ queryKey: ["service-orders"] });
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: ServiceOrderItem) => {
    setEditingItem(item);
    setForm({
      item_type: item.item_type,
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      notes: item.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, serviceOrderId, data: form });
    } else {
      await addMutation.mutateAsync({ serviceOrderId, data: { ...form, sort_order: (items?.length ?? 0) } });
    }
    invalidateOsTotal();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id, serviceOrderId });
    invalidateOsTotal();
  };

  return (
    <div className="space-y-6">
      {/* Total summary */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Oficial da OS</p>
                <p className="text-2xl font-bold font-mono text-primary">{formatBRL(total)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {items?.length ?? 0} {(items?.length ?? 0) === 1 ? "item" : "itens"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Items list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Itens da Ordem de Serviço</CardTitle>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
          ) : !items?.length ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum item adicionado.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione serviços, produtos e mão de obra para compor o valor oficial da OS.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge className={`gap-1 ${typeColors[item.item_type]}`}>
                            {typeIcons[item.item_type]}
                            {itemTypeLabels[item.item_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{item.description}</p>
                          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{Number(item.quantity)}</TableCell>
                        <TableCell className="text-right font-mono">{formatBRL(Number(item.unit_price))}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{formatBRL(Number(item.total_price))}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover item?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={4} className="text-right font-semibold text-sm">Total Geral</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{formatBRL(total)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={`gap-1 text-[10px] ${typeColors[item.item_type]}`}>
                        {typeIcons[item.item_type]}
                        {itemTypeLabels[item.item_type]}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover item?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>{Number(item.quantity)} × {formatBRL(Number(item.unit_price))}</span>
                      <span className="font-mono font-bold text-foreground">{formatBRL(Number(item.total_price))}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-semibold text-sm">Total Geral</span>
                  <span className="font-mono font-bold text-primary">{formatBRL(total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Adicionar Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.item_type} onValueChange={(v) => setForm((f) => ({ ...f, item_type: v as SOItemType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(itemTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Troca de tela, mão de obra, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Preço Unitário (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="text-lg font-bold font-mono text-primary">
                {formatBRL(form.quantity * form.unit_price)}
              </p>
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={form.notes || ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!form.description.trim() || addMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
