import { useState } from "react";
import { BookmarkPlus, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts, usePartReservations, useReservePart, useReleaseReservation } from "../hooks/useInventory";

interface Props {
  serviceOrderId: string;
  diagnosisId?: string;
}

export default function PartReservationPanel({ serviceOrderId, diagnosisId }: Props) {
  const { data: products } = useProducts();
  const { data: reservations } = usePartReservations(serviceOrderId);
  const reserve = useReservePart();
  const release = useReleaseReservation();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [showForm, setShowForm] = useState(false);

  const handleReserve = async () => {
    if (!selectedProduct) return;
    await reserve.mutateAsync({
      productId: selectedProduct,
      serviceOrderId,
      diagnosisId,
      quantity: parseInt(qty) || 1,
    });
    setSelectedProduct("");
    setQty("1");
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BookmarkPlus className="h-4 w-4" /> Peças Reservadas
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Package className="h-3 w-3 mr-1" /> Reservar
        </Button>
      </div>

      {showForm && (
        <div className="flex gap-2 p-3 border rounded-md bg-muted/30">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="Selecionar peça..." />
            </SelectTrigger>
            <SelectContent>
              {products?.filter(p => p.is_active && (p.quantity - (p as any).reserved_quantity || 0) > 0).map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.sku} — {p.name} (disp: {p.quantity - ((p as any).reserved_quantity || 0)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="h-8 w-16" />
          <Button size="sm" onClick={handleReserve} disabled={reserve.isPending || !selectedProduct}>
            Reservar
          </Button>
        </div>
      )}

      {reservations && reservations.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Peça</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{r.products?.sku} — {r.products?.name}</TableCell>
                <TableCell className="text-right">{r.quantity}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">Reservado</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => release.mutate(r.id)} disabled={release.isPending}>
                    <X className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma peça reservada.</p>
      )}
    </div>
  );
}
