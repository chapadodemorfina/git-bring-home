import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLowStockProducts } from "../hooks/useInventory";

export default function LowStockAlert() {
  const { data: lowStock } = useLowStockProducts();
  if (!lowStock?.length) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Estoque Baixo ({lowStock.length} itens)</AlertTitle>
      <AlertDescription>
        <div className="flex flex-wrap gap-2 mt-2">
          {lowStock.slice(0, 10).map(p => (
            <Badge key={p.id} variant="outline" className="text-destructive border-destructive">
              {p.sku}: {p.quantity}/{p.minimum_quantity}
            </Badge>
          ))}
          {lowStock.length > 10 && <Badge variant="outline">+{lowStock.length - 10} mais</Badge>}
        </div>
      </AlertDescription>
    </Alert>
  );
}
