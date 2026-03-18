import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSale, useSaleItems, useSalePayments, useUpdateDraftSale, useCompleteSale } from "../hooks/useSales";
import { useAllProducts } from "@/modules/inventory/hooks/useInventory";
import { useCustomers } from "@/modules/customers/hooks/useCustomers";
import type { SaleFormItem, SalePaymentMethod } from "../types";
import { paymentMethodLabels } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, ShoppingBag, Save, CheckCircle } from "lucide-react";

export default function SaleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: sale, isLoading: saleLoading } = useSale(id);
  const { data: existingItems, isLoading: itemsLoading } = useSaleItems(id);
  const { data: existingPayments, isLoading: paymentsLoading } = useSalePayments(id);
  const updateDraft = useUpdateDraftSale();
  const completeSale = useCompleteSale();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<SaleFormItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Payments
  const [payments, setPayments] = useState<{ method: SalePaymentMethod; amount: number; reference?: string }[]>([]);
  const [payMethod, setPayMethod] = useState<SalePaymentMethod>("pix");
  const [payAmount, setPayAmount] = useState(0);
  const [payRef, setPayRef] = useState("");

  const { data: customers } = useCustomers(customerSearch, true, 1, 10);
  const { data: products } = useAllProducts(productSearch);

  // Initialize form from existing sale data
  useEffect(() => {
    if (!sale || !existingItems || !existingPayments || initialized) return;
    setCustomerId(sale.customer_id);
    setCustomerSearch(sale.customer_name || "");
    setDiscount(Number(sale.discount_amount));
    setSurcharge(Number(sale.surcharge_amount));
    setNotes(sale.notes || "");
    setItems(existingItems.map((i) => ({
      product_id: i.product_id || "",
      sku: i.sku_snapshot || "",
      name: i.product_name_snapshot,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      cost_price: Number(i.cost_price_snapshot),
      discount: Number(i.discount_amount),
      available_stock: 999, // Will be refreshed by product data
    })));
    setPayments(existingPayments.map((p) => ({
      method: p.payment_method,
      amount: Number(p.amount),
      reference: p.reference || undefined,
    })));
    setInitialized(true);
  }, [sale, existingItems, existingPayments, initialized]);

  // Refresh available stock for items
  useEffect(() => {
    if (!products || !initialized) return;
    setItems((prev) => prev.map((item) => {
      const product = products.find((p: any) => p.id === item.product_id);
      if (product) {
        return { ...item, available_stock: (product as any).quantity - ((product as any).reserved_quantity || 0) + item.quantity };
      }
      return item;
    }));
  }, [products, initialized]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.unit_price * i.quantity - i.discount), 0), [items]);
  const total = useMemo(() => Math.max(0, subtotal - discount + surcharge), [subtotal, discount, surcharge]);
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const remaining = total - totalPaid;

  const isLoading = saleLoading || itemsLoading || paymentsLoading;

  if (isLoading) return <div className="space-y-4 p-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (!sale) return <p className="text-center py-12 text-muted-foreground">Venda não encontrada</p>;
  if (sale.status !== "draft") {
    navigate(`/sales/${id}`);
    return null;
  }

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      if (existing.quantity >= (product.quantity - product.reserved_quantity + existing.quantity)) return;
      setItems(items.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unit_price: product.sale_price,
        cost_price: product.cost_price,
        discount: 0,
        available_stock: product.quantity - product.reserved_quantity,
      }]);
    }
    setProductSearch("");
  };

  const updateItem = (idx: number, field: keyof SaleFormItem, value: number) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" && value > item.available_stock) updated.quantity = item.available_stock;
      if (field === "quantity" && value < 1) updated.quantity = 1;
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const addPayment = () => {
    if (payAmount <= 0) return;
    setPayments([...payments, { method: payMethod, amount: payAmount, reference: payRef || undefined }]);
    setPayAmount(0);
    setPayRef("");
  };

  const removePayment = (idx: number) => setPayments(payments.filter((_, i) => i !== idx));

  const handleSave = (finalize: boolean) => {
    if (items.length === 0) return;
    updateDraft.mutate(
      {
        sale_id: sale.id,
        customer_id: customerId,
        items,
        discount_amount: discount,
        surcharge_amount: surcharge,
        notes,
        payments,
        finalize,
      },
      { onSuccess: () => navigate(`/sales/${sale.id}`) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/sales/${id}`)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6" /> Editar {sale.sale_number}</h1>
          <p className="text-muted-foreground">Edite o rascunho da venda</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base">Cliente (opcional)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar cliente por nome, telefone, documento..."
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); if (!e.target.value) setCustomerId(null); }}
                />
                {customerId && (
                  <Button variant="outline" size="sm" onClick={() => { setCustomerId(null); setCustomerSearch(""); }}>Limpar</Button>
                )}
              </div>
              {customerSearch && !customerId && customers?.items && customers.items.length > 0 && (
                <div className="border rounded-md mt-2 max-h-40 overflow-y-auto">
                  {customers.items.map((c: any) => (
                    <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => { setCustomerId(c.id); setCustomerSearch(c.full_name); }}>
                      {c.full_name} {c.document ? `· ${c.document}` : ""} {c.phone ? `· ${c.phone}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Itens da Venda</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Buscar produto por nome ou SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              {productSearch && products && products.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {products.filter((p: any) => p.quantity > p.reserved_quantity).map((p: any) => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between" onClick={() => addProduct(p)}>
                      <span>{p.name} <span className="text-muted-foreground">({p.sku})</span></span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Estoque: {p.quantity - p.reserved_quantity}</Badge>
                        <span className="font-medium">R$ {Number(p.sale_price).toFixed(2).replace(".", ",")}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {items.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">Nenhum item adicionado</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="w-20">Qtd</TableHead>
                        <TableHead className="w-28">Preço Un.</TableHead>
                        <TableHead className="w-24">Desc.</TableHead>
                        <TableHead className="text-right w-28">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.sku} · Estoque: {item.available_stock}</div>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={1} max={item.available_stock} value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="h-8 w-16" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" min={0} value={item.unit_price}
                              onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="h-8 w-24" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" min={0} value={item.discount}
                              onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)} className="h-8 w-20" />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {(item.unit_price * item.quantity - item.discount).toFixed(2).replace(".", ",")}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Totals */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace(".", ",")}</span></div>
              <div className="flex items-center gap-2">
                <Label className="text-sm w-20">Desconto</Label>
                <Input type="number" step="0.01" min={0} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm w-20">Acréscimo</Label>
                <Input type="number" step="0.01" min={0} value={surcharge} onChange={(e) => setSurcharge(parseFloat(e.target.value) || 0)} className="h-8" />
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>R$ {total.toFixed(2).replace(".", ",")}</span></div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pagamentos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                  <span>{paymentMethodLabels[p.method]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">R$ {p.amount.toFixed(2).replace(".", ",")}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePayment(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="space-y-2 pt-2">
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as SalePaymentMethod)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(paymentMethodLabels) as [SalePaymentMethod, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input type="number" step="0.01" min={0} placeholder="Valor" value={payAmount || ""} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="h-8" />
                  <Button size="sm" variant="outline" onClick={addPayment} disabled={payAmount <= 0}><Plus className="h-3 w-3" /></Button>
                </div>
                <Input placeholder="Referência (opcional)" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="h-8" />
              </div>
              <Separator />
              <div className="flex justify-between text-sm"><span>Total pago</span><span className="font-medium">R$ {totalPaid.toFixed(2).replace(".", ",")}</span></div>
              {remaining > 0 && <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400"><span>Restante</span><span>R$ {remaining.toFixed(2).replace(".", ",")}</span></div>}
              {remaining < 0 && <div className="flex justify-between text-sm text-green-600 dark:text-green-400"><span>Troco</span><span>R$ {Math.abs(remaining).toFixed(2).replace(".", ",")}</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Observações sobre a venda..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={() => handleSave(true)} disabled={items.length === 0 || updateDraft.isPending} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" /> Concluir Venda
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={items.length === 0 || updateDraft.isPending} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Salvar Rascunho
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
