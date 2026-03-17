import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Package, Truck, Clock, ShoppingCart, ExternalLink,
} from "lucide-react";

const sb = supabase as any;

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reserved_quantity: number;
  minimum_quantity: number;
  cost_price: number;
  supplier_id: string | null;
  suppliers?: { id: string; name: string; lead_time_days?: number | null; phone?: string | null; whatsapp?: string | null } | null;
}

export default function SmartReplenishmentPanel() {
  const { data: lowStock, isLoading } = useQuery<LowStockProduct[]>({
    queryKey: ["products", "low_stock_smart"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("products")
        .select("id, name, sku, quantity, reserved_quantity, minimum_quantity, cost_price, supplier_id, suppliers(id, name, lead_time_days, phone, whatsapp)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data as LowStockProduct[]).filter(p => p.quantity <= p.minimum_quantity);
    },
  });

  if (isLoading || !lowStock?.length) return null;

  const totalReorderCost = lowStock.reduce((sum, p) => {
    const needed = Math.max(0, p.minimum_quantity * 2 - p.quantity);
    return sum + needed * p.cost_price;
  }, 0);

  const bySupplier = lowStock.reduce<Record<string, LowStockProduct[]>>((acc, p) => {
    const key = p.suppliers?.name || "Sem fornecedor";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-destructive" />
            Reposição Inteligente — {lowStock.length} itens
          </CardTitle>
          <Badge variant="outline" className="text-destructive border-destructive">
            Investimento estimado: {fmt(totalReorderCost)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(bySupplier).map(([supplier, products]) => {
          const leadTime = products[0]?.suppliers?.lead_time_days;
          return (
            <div key={supplier}>
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{supplier}</span>
                {leadTime && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    {leadTime}d entrega
                  </Badge>
                )}
              </div>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-xs text-muted-foreground">
                      <th className="text-left px-3 py-1.5 font-medium">SKU</th>
                      <th className="text-left px-3 py-1.5 font-medium">Peça</th>
                      <th className="text-center px-3 py-1.5 font-medium">Atual</th>
                      <th className="text-center px-3 py-1.5 font-medium">Reservado</th>
                      <th className="text-center px-3 py-1.5 font-medium">Mínimo</th>
                      <th className="text-center px-3 py-1.5 font-medium">Pedir</th>
                      <th className="text-right px-3 py-1.5 font-medium">Custo Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const available = p.quantity - p.reserved_quantity;
                      const needed = Math.max(0, p.minimum_quantity * 2 - p.quantity);
                      const urgency = available <= 0 ? "text-destructive font-bold" : "text-amber-600 dark:text-amber-400";
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-1.5 font-mono text-xs">{p.sku}</td>
                          <td className="px-3 py-1.5">
                            <Link to={`/inventory/${p.id}`} className="hover:underline text-primary">
                              {p.name}
                            </Link>
                          </td>
                          <td className={`px-3 py-1.5 text-center ${urgency}`}>{p.quantity}</td>
                          <td className="px-3 py-1.5 text-center text-muted-foreground">{p.reserved_quantity}</td>
                          <td className="px-3 py-1.5 text-center">{p.minimum_quantity}</td>
                          <td className="px-3 py-1.5 text-center font-semibold">{needed}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground">{fmt(needed * p.cost_price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
