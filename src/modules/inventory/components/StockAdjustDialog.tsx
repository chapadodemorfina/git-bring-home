import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdjustStock } from "../hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  currentQuantity: number;
  productName: string;
}

export default function StockAdjustDialog({ open, onOpenChange, productId, currentQuantity, productName }: Props) {
  const [newQty, setNewQty] = useState(String(currentQuantity));
  const [reason, setReason] = useState("");
  const adjust = useAdjustStock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) return;
    await adjust.mutateAsync({ productId, newQuantity: qty, reason: reason.trim() || "Ajuste manual" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajustar Estoque — {productName}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Quantidade atual</Label>
            <p className="text-2xl font-bold text-muted-foreground">{currentQuantity}</p>
          </div>
          <div>
            <Label htmlFor="new-qty">Nova quantidade *</Label>
            <Input id="new-qty" type="number" min={0} value={newQty} onChange={e => setNewQty(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reason">Motivo *</Label>
            <Textarea id="reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Contagem física, perda, devolução..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={adjust.isPending}>{adjust.isPending ? "Ajustando..." : "Confirmar Ajuste"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
