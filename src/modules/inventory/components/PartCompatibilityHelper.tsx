import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const sb = supabase as any;

interface CompatibleProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reserved_quantity: number;
  cost_price: number;
  compatible_devices: string | null;
}

interface Props {
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  onSelectProduct?: (product: CompatibleProduct) => void;
}

export default function PartCompatibilityHelper({ deviceType, deviceBrand, deviceModel, onSelectProduct }: Props) {
  const hasContext = !!(deviceType || deviceBrand || deviceModel);

  const { data: compatibleProducts } = useQuery<CompatibleProduct[]>({
    queryKey: ["compatible-parts", deviceType, deviceBrand, deviceModel],
    enabled: hasContext,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Search products whose compatible_devices field matches the device info
      const terms: string[] = [];
      if (deviceBrand) terms.push(deviceBrand);
      if (deviceModel) terms.push(deviceModel);
      if (deviceType) terms.push(deviceType);

      if (terms.length === 0) return [];

      // Build OR filter for compatible_devices
      const filters = terms.map(t => `compatible_devices.ilike.%${t}%`).join(",");
      const { data, error } = await sb
        .from("products")
        .select("id, name, sku, quantity, reserved_quantity, cost_price, compatible_devices")
        .eq("is_active", true)
        .or(filters)
        .order("name")
        .limit(20);

      if (error) throw error;
      return data as CompatibleProduct[];
    },
  });

  if (!hasContext || !compatibleProducts?.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Peças Compatíveis ({compatibleProducts.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {compatibleProducts.map((p) => {
          const available = p.quantity - p.reserved_quantity;
          const inStock = available > 0;
          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!inStock || !onSelectProduct}
                  onClick={() => onSelectProduct?.(p)}
                >
                  {inStock ? <Plus className="h-3 w-3" /> : <Package className="h-3 w-3 text-destructive" />}
                  {p.sku}
                  <Badge variant={inStock ? "secondary" : "destructive"} className="text-[10px] px-1 py-0 ml-1">
                    {available}
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  Custo: R$ {p.cost_price.toFixed(2)} · Estoque: {available} un.
                </p>
                {p.compatible_devices && (
                  <p className="text-xs text-muted-foreground mt-1">Compatível: {p.compatible_devices}</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
