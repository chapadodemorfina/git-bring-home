/**
 * Frente de Caixa (PDV) — Point of Sale optimized for speed
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateSale } from "../hooks/useSales";
import { useOpenCashRegister, useAddCashMovement } from "@/modules/cash-register/hooks/useCashRegister";
import { useGenerateSaleCommissions } from "@/modules/commissions/hooks/useCommissions";
import { useAutoSendMessage } from "@/modules/messaging/hooks/useCustomerMessaging";
import { useToast } from "@/hooks/use-toast";
import { generateSaleThermalReceiptPdf } from "@/lib/pdf-generators/sale-thermal-receipt-pdf";
import { generateSaleReceiptPdf } from "@/lib/pdf-generators/sale-receipt-pdf";
import type { SalePaymentMethod, SaleFormItem } from "../types";
import { paymentMethodLabels } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, DollarSign, CreditCard, Smartphone,
  Banknote, XCircle, Printer, Receipt, RotateCcw, Maximize, Minimize,
  UserPlus, Package, Keyboard, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const db = supabase as any;

interface CartItem extends SaleFormItem {
  id: string; // local key
}

interface ProductResult {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number;
  cost_price: number;
  quantity: number;
  brand: string | null;
  category: string | null;
  barcode: string | null;
}

// ── Product Search Hook (lightweight, debounced) ──
function usePdvProductSearch(search: string) {
  return useQuery<ProductResult[]>({
    queryKey: ["pdv-products", search],
    enabled: search.length >= 1,
    queryFn: async () => {
      const q = search.trim();
      let query = db
        .from("products")
        .select("id, name, sku, sale_price, cost_price, quantity, brand, category, barcode")
        .eq("is_active", true)
        .gt("quantity", 0)
        .order("name")
        .limit(12);

      query = query.or(
        `name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`
      );

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductResult[];
    },
    staleTime: 5000,
  });
}

// ── Customer Search Hook ──
function usePdvCustomerSearch(search: string) {
  return useQuery({
    queryKey: ["pdv-customers", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await db
        .from("customers")
        .select("id, full_name, phone, document")
        .eq("is_active", true)
        .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,document.ilike.%${search}%`)
        .limit(8);
      if (error) throw error;
      return data as { id: string; full_name: string; phone: string | null; document: string | null }[];
    },
    staleTime: 10000,
  });
}

export default function PdvPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const createSale = useCreateSale();
  const { data: openCashRegister } = useOpenCashRegister();
  const addCashMovement = useAddCashMovement();
  const generateCommissions = useGenerateSaleCommissions();
  const autoSend = useAutoSendMessage();
  // ── State ──
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [surcharge, setSurcharge] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("pix");
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastSaleNumber, setLastSaleNumber] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);

  const canEditPrice = hasRole("admin") || hasRole("manager");

  // ── Debounce search ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isFetching } = usePdvProductSearch(debouncedSearch);
  const { data: customers = [] } = usePdvCustomerSearch(customerSearch);

  // ── Cart calculations ──
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.unit_price * i.quantity - i.discount, 0), [cart]);
  const discountAmount = useMemo(() => discountType === "percent" ? subtotal * (discount / 100) : discount, [subtotal, discount, discountType]);
  const total = useMemo(() => Math.max(0, subtotal - discountAmount + surcharge), [subtotal, discountAmount, surcharge]);
  const change = useMemo(() => {
    if (paymentMethod !== "cash") return 0;
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - total);
  }, [paymentMethod, amountReceived, total]);

  // ── Add product to cart ──
  const addToCart = useCallback((product: ProductResult) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast({ title: "Estoque insuficiente", description: `Máximo: ${product.quantity}`, variant: "destructive" });
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          product_id: product.id,
          sku: product.sku || "",
          name: product.name,
          quantity: 1,
          unit_price: product.sale_price || 0,
          cost_price: product.cost_price || 0,
          discount: 0,
          available_stock: product.quantity,
        },
      ];
    });
    setSearch("");
    searchRef.current?.focus();
  }, [toast]);

  // ── Update quantity ──
  const updateQty = useCallback((idx: number, delta: number) => {
    setCart((prev) => {
      const item = prev[idx];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      if (newQty > item.available_stock) {
        toast({ title: "Estoque insuficiente", variant: "destructive" });
        return prev;
      }
      return prev.map((i, idx2) => (idx2 === idx ? { ...i, quantity: newQty } : i));
    });
  }, [toast]);

  // ── Remove item ──
  const removeItem = useCallback((idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx(-1);
  }, []);

  // ── Clear cart ──
  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount(0);
    setSurcharge(0);
    setCustomerId(null);
    setCustomerName(null);
    setNotes("");
    setAmountReceived("");
    setPaymentMethod("pix");
    setSelectedIdx(-1);
    setShowClearConfirm(false);
    searchRef.current?.focus();
  }, []);

  // ── Finalize Sale ──
  const finalizeSale = useCallback(async () => {
    if (cart.length === 0) {
      toast({ title: "Carrinho vazio", variant: "destructive" });
      return;
    }
    if (!user) return;
    if (!openCashRegister) {
      toast({ title: "Caixa não aberto", description: "Abra o caixa antes de finalizar vendas.", variant: "destructive" });
      return;
    }

    const received = parseFloat(amountReceived) || 0;
    const payAmount = paymentMethod === "cash" && received > total ? total : (received || total);

    try {
      const result = await createSale.mutateAsync({
        customer_id: customerId,
        seller_user_id: user.id,
        items: cart.map(({ id, ...rest }) => rest),
        discount_amount: discountAmount,
        surcharge_amount: surcharge,
        notes: notes || undefined,
        payments: [{ method: paymentMethod, amount: payAmount }],
        finalize: true,
      });

      // Auto-create cash register movement if register is open
      if (openCashRegister) {
        try {
          await addCashMovement.mutateAsync({
            cash_register_id: openCashRegister.id,
            movement_type: "sale",
            payment_method: paymentMethod,
            amount: payAmount,
            description: `Venda ${result.sale_number || ""}`.trim(),
            reference_type: "sale",
            reference_id: result.id,
          });
        } catch {
          // non-blocking: movement registration failure shouldn't block the sale
        }
      }

      // Auto-generate commissions
      try {
        await generateCommissions.mutateAsync(result.id);
      } catch {
        // non-blocking
      }

      setLastSaleId(result.id);
      setLastSaleNumber(result.sale_number || "");
      setShowSuccessDialog(true);

      // Auto-send WhatsApp receipt (non-blocking, only if customer has phone)
      if (customerId && customerName) {
        try {
          const { data: cust } = await db.from("customers").select("phone, whatsapp").eq("id", customerId).single();
          const custPhone = cust?.whatsapp || cust?.phone;
          if (custPhone) {
            const itemsSummary = cart.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
            autoSend({
              customerId,
              phone: custPhone,
              eventType: "sale_completed",
              referenceType: "sale",
              referenceId: result.id,
              templateKey: "sale_completed_whatsapp",
              variables: {
                customer_name: customerName,
                sale_number: result.sale_number || "",
                items_summary: itemsSummary,
                total_amount: total.toFixed(2),
                payment_method: paymentMethodLabel,
                sale_date: new Date().toLocaleString("pt-BR"),
              },
            });
          }
        } catch {
          // non-blocking
        }
      }
    } catch {
      // error handled by mutation
    }
  }, [cart, user, customerId, customerName, discountAmount, surcharge, notes, paymentMethod, amountReceived, total, createSale, toast, openCashRegister, addCashMovement, autoSend]);

  // ── Post-sale actions ──
  const handleNewSale = useCallback(() => {
    setShowSuccessDialog(false);
    clearCart();
  }, [clearCart]);

  const handlePrintReceipt = useCallback(async () => {
    if (!lastSaleId) return;
    const { data: sale } = await db.from("sales").select("*").eq("id", lastSaleId).single();
    const { data: items } = await db.from("sale_items").select("*").eq("sale_id", lastSaleId);
    const { data: payments } = await db.from("sale_payments").select("*").eq("sale_id", lastSaleId);
    if (sale && items) {
      generateSaleThermalReceiptPdf(sale, items, payments || [], "i9 Solution");
    }
    setShowSuccessDialog(false);
    clearCart();
  }, [lastSaleId, clearCart]);

  const handleViewSale = useCallback(() => {
    setShowSuccessDialog(false);
    if (lastSaleId) navigate(`/sales/${lastSaleId}`);
  }, [lastSaleId, navigate]);

  // ── Fullscreen toggle ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if inside an input that isn't search
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        finalizeSale();
      } else if (e.key === "Escape") {
        if (cart.length > 0) {
          e.preventDefault();
          setShowClearConfirm(true);
        }
      } else if (e.key === "F1") {
        e.preventDefault();
        setShowShortcuts(true);
      } else if (!isInput && selectedIdx >= 0) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          updateQty(selectedIdx, 1);
        } else if (e.key === "-") {
          e.preventDefault();
          updateQty(selectedIdx, -1);
        } else if (e.key === "Delete") {
          e.preventDefault();
          removeItem(selectedIdx);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [finalizeSale, cart.length, selectedIdx, updateQty, removeItem]);

  // ── Auto-focus search on mount ──
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // ── Handle search Enter ──
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && products.length > 0) {
      e.preventDefault();
      addToCart(products[0]);
    }
  };

  const paymentButtons: { method: SalePaymentMethod; icon: React.ReactNode; label: string }[] = [
    { method: "cash", icon: <Banknote className="h-5 w-5" />, label: "Dinheiro" },
    { method: "pix", icon: <Smartphone className="h-5 w-5" />, label: "PIX" },
    { method: "credit_card", icon: <CreditCard className="h-5 w-5" />, label: "Crédito" },
    { method: "debit_card", icon: <DollarSign className="h-5 w-5" />, label: "Débito" },
  ];

  return (
    <div className="h-screen flex flex-col bg-muted/30 overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-lg font-bold tracking-tight">Frente de Caixa</h1>
          {customerName && (
            <Badge variant="secondary" className="ml-2 text-sm">
              {customerName}
              <button onClick={() => { setCustomerId(null); setCustomerName(null); }} className="ml-1 hover:text-destructive">
                <XCircle className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setShowShortcuts(true)}>
            <Keyboard className="h-4 w-4 mr-1" /> F1
          </Button>
          <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/sales")}>
            Voltar
          </Button>
        </div>
      </div>

      {/* ── Cash Register Warning ── */}
      {!openCashRegister && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border-b border-destructive/20">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Caixa não aberto — abra o caixa em <a href="/cash-register" className="underline font-bold">/cash-register</a> antes de finalizar vendas.</span>
        </div>
      )}

      {/* ── Main 3-Panel Layout ── */}
      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* ── LEFT: Product Search ── */}
        <div className="w-[320px] flex-shrink-0 border-r bg-background flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar produto, SKU ou código..."
                className="pl-9 h-11 text-base"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowCustomerSearch(true)}>
                <UserPlus className="h-3 w-3 mr-1" /> Cliente
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs text-destructive hover:text-destructive"
                onClick={() => cart.length > 0 ? setShowClearConfirm(true) : null}
                disabled={cart.length === 0}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          <div ref={resultListRef} className="flex-1 overflow-y-auto p-2 space-y-1">
            {isFetching && search.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>
            )}
            {!isFetching && search.length > 0 && products.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate group-hover:text-primary">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.sku && <span className="text-xs text-muted-foreground">{p.sku}</span>}
                      {p.brand && <span className="text-xs text-muted-foreground">• {p.brand}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-primary">
                      {(p.sale_price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className={cn("text-xs", p.quantity <= 3 ? "text-destructive font-medium" : "text-muted-foreground")}>
                      Est: {p.quantity}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {!search && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Digite para buscar</p>
                <p className="text-xs mt-1">Nome, SKU ou código de barras</p>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Cart Items ── */}
        <div className="flex-1 flex flex-col bg-background min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Itens ({cart.length})</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {cart.reduce((s, i) => s + i.quantity, 0)} un.
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-medium">Carrinho vazio</p>
                <p className="text-sm mt-1">Busque e adicione produtos</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIdx(idx)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                      selectedIdx === idx ? "bg-accent" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.sku && <p className="text-xs text-muted-foreground">{item.sku}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); updateQty(idx, -1); }}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); updateQty(idx, 1); }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-right w-24 flex-shrink-0">
                      {canEditPrice ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, unit_price: val } : c)));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-right text-sm font-medium bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-primary focus:outline-none py-0.5"
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {item.unit_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(item.unit_price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>

                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeItem(idx); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Payment Panel ── */}
        <div className="w-[340px] flex-shrink-0 border-l bg-background flex flex-col">
          {/* Totals */}
          <div className="p-4 space-y-3 border-b">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">Desc.</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm flex-1"
              />
              <Button
                size="sm"
                variant={discountType === "fixed" ? "default" : "outline"}
                className="h-8 px-2 text-xs"
                onClick={() => setDiscountType("fixed")}
              >
                R$
              </Button>
              <Button
                size="sm"
                variant={discountType === "percent" ? "default" : "outline"}
                className="h-8 px-2 text-xs"
                onClick={() => setDiscountType("percent")}
              >
                %
              </Button>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto</span>
                <span>-{discountAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">Acrés.</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={surcharge || ""}
                onChange={(e) => setSurcharge(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm flex-1"
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-black text-primary">
                {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-4 space-y-3 border-b">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentButtons.map((pb) => (
                <Button
                  key={pb.method}
                  variant={paymentMethod === pb.method ? "default" : "outline"}
                  className={cn("h-12 flex flex-col gap-0.5", paymentMethod === pb.method && "ring-2 ring-primary ring-offset-2")}
                  onClick={() => setPaymentMethod(pb.method)}
                >
                  {pb.icon}
                  <span className="text-xs">{pb.label}</span>
                </Button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Recebido</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0,00"
                    className="h-10 text-lg font-bold text-right"
                  />
                </div>
                {change > 0 && (
                  <div className="flex justify-between items-center bg-accent rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">Troco</span>
                    <span className="text-lg font-black text-primary">
                      {change.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="px-4 py-2 border-b">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações (opcional)"
              className="h-8 text-xs"
            />
          </div>

          {/* Finalize button */}
          <div className="p-4 mt-auto">
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold"
              disabled={cart.length === 0 || createSale.isPending}
              onClick={finalizeSale}
            >
              {createSale.isPending ? (
                <span className="animate-pulse">Processando...</span>
              ) : (
                <>
                  <Receipt className="h-5 w-5 mr-2" />
                  FINALIZAR VENDA (F4)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Clear Cart Confirmation ── */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens serão removidos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearCart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Customer Search Dialog ── */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <Input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Nome, telefone ou documento..."
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCustomerId(c.id);
                  setCustomerName(c.full_name);
                  setShowCustomerSearch(false);
                  setCustomerSearch("");
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <p className="font-medium text-sm">{c.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.phone || ""} {c.document ? `• ${c.document}` : ""}
                </p>
              </button>
            ))}
            {customerSearch.length >= 2 && customers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCustomerId(null); setCustomerName(null); setShowCustomerSearch(false); }}>
              Venda sem cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sale Success Dialog ── */}
      <Dialog open={showSuccessDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm text-center" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">Venda Concluída!</h2>
            <p className="text-muted-foreground text-sm">{lastSaleNumber}</p>
            <p className="text-2xl font-black text-primary mt-3">
              {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            {change > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Troco: {change.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={handlePrintReceipt} className="flex flex-col gap-1 h-auto py-3">
              <Printer className="h-4 w-4" />
              <span className="text-xs">Imprimir</span>
            </Button>
            <Button variant="outline" onClick={handleViewSale} className="flex flex-col gap-1 h-auto py-3">
              <Receipt className="h-4 w-4" />
              <span className="text-xs">Ver Venda</span>
            </Button>
            <Button onClick={handleNewSale} className="flex flex-col gap-1 h-auto py-3">
              <Plus className="h-4 w-4" />
              <span className="text-xs">Nova Venda</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Keyboard Shortcuts Dialog ── */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Atalhos de Teclado</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ["F1", "Mostrar atalhos"],
              ["F2", "Focar busca"],
              ["F4", "Finalizar venda"],
              ["Enter", "Adicionar primeiro resultado"],
              ["+", "Aumentar quantidade (item selecionado)"],
              ["-", "Diminuir quantidade"],
              ["Delete", "Remover item selecionado"],
              ["Esc", "Limpar carrinho"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono font-bold">{key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
