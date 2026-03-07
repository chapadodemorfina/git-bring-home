import { useState } from "react";
import { useDiagnosisParts, useAddDiagnosisPart, useDeleteDiagnosisPart } from "../hooks/useDiagnostics";
import { useProducts } from "@/modules/inventory/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Link2 } from "lucide-react";

interface Props {
  diagnosisId: string;
  readOnly?: boolean;
}

export default function DiagnosisPartsPanel({ diagnosisId, readOnly }: Props) {
  const { data: parts, isLoading } = useDiagnosisParts(diagnosisId);
  const { data: products } = useProducts();
  const addPart = useAddDiagnosisPart();
  const deletePart = useDeleteDiagnosisPart();
  const [partName, setPartName] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [useInventory, setUseInventory] = useState(false);

  const handleAdd = async () => {
    if (useInventory && selectedProductId) {
      const product = products?.find(p => p.id === selectedProductId);
      if (!product) return;
      await addPart.mutateAsync({
        diagnosisId,
        partName: product.name,
        quantity: parseInt(qty) || 1,
        estimatedUnitCost: product.cost_price,
      });
    } else {
      if (!partName.trim()) return;
      await addPart.mutateAsync({
        diagnosisId,
        partName: partName.trim(),
        quantity: parseInt(qty) || 1,
        estimatedUnitCost: parseFloat(cost) || 0,
      });
    }
    setPartName("");
    setQty("1");
    setCost("");
    setSelectedProductId("");
  };

  const totalCost = (parts || []).reduce((s, p) => s + p.quantity * p.estimated_unit_cost, 0);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-3">
      {parts && parts.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 font-medium">Peça</th>
                <th className="text-center py-1 font-medium w-16">Qtd</th>
                <th className="text-right py-1 font-medium w-24">Custo Unit.</th>
                <th className="text-right py-1 font-medium w-24">Subtotal</th>
                {!readOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr key={part.id} className="border-b last:border-0">
                  <td className="py-1.5 text-sm text-foreground">
                    {part.part_name}
                    {part.product_id && <Link2 className="h-3 w-3 inline ml-1 text-primary" />}
                  </td>
                  <td className="py-1.5 text-center text-sm">{part.quantity}</td>
                  <td className="py-1.5 text-right text-sm">R$ {Number(part.estimated_unit_cost).toFixed(2)}</td>
                  <td className="py-1.5 text-right text-sm font-medium">
                    R$ {(part.quantity * part.estimated_unit_cost).toFixed(2)}
                  </td>
                  {!readOnly && (
                    <td className="py-1.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => deletePart.mutate({ id: part.id, diagnosisId })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="py-1.5 text-right font-medium text-sm text-foreground">Total estimado:</td>
                <td className="py-1.5 text-right font-bold text-sm text-foreground">R$ {totalCost.toFixed(2)}</td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!readOnly && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={useInventory ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setUseInventory(!useInventory)}
            >
              <Link2 className="h-3 w-3 mr-1" />
              {useInventory ? "Do Estoque" : "Manual"}
            </Button>
          </div>

          <div className="flex gap-2">
            {useInventory ? (
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Selecionar do estoque..." />
                </SelectTrigger>
                <SelectContent>
                  {products?.filter(p => p.is_active).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} — {p.name} (est: {p.quantity}, R$ {p.cost_price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Nome da peça..."
                className="h-8 flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              />
            )}
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qtd"
              type="number"
              min="1"
              className="h-8 w-16"
            />
            {!useInventory && (
              <Input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Custo"
                type="number"
                step="0.01"
                min="0"
                className="h-8 w-24"
              />
            )}
            <Button variant="outline" size="sm" onClick={handleAdd} disabled={addPart.isPending}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {(!parts || parts.length === 0) && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma peça registrada.</p>
      )}
    </div>
  );
}
