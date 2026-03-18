import { useState } from "react";
import { useCreatePayment } from "../hooks/useFinance";
import { PaymentFormData, paymentMethodLabels, PaymentMethod, Payment } from "../types";
import { useAutoSendMessage } from "@/modules/messaging/hooks/useCustomerMessaging";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  entryId: string;
  remainingAmount: number;
  payments: Payment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string | null;
  customerName?: string;
  reference?: string;
}

export default function PaymentDialog({ entryId, remainingAmount, payments, open, onOpenChange, customerId, customerName, reference }: Props) {
  const [amount, setAmount] = useState(remainingAmount.toString());
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const createMutation = useCreatePayment();
  const autoSend = useAutoSendMessage();

  const handleSubmit = async () => {
    const paidAmount = parseFloat(amount);
    await createMutation.mutateAsync({
      entryId,
      data: {
        amount: paidAmount,
        payment_method: method,
        reference: ref || undefined,
        notes: notes || undefined,
      },
    });

    // Auto-send WhatsApp payment confirmation
    if (customerId) {
      try {
        const db = supabase as any;
        const { data: cust } = await db.from("customers").select("phone, whatsapp, full_name").eq("id", customerId).single();
        const phone = cust?.whatsapp || cust?.phone;
        if (phone) {
          const newRemaining = Math.max(0, remainingAmount - paidAmount);
          autoSend({
            customerId,
            phone,
            eventType: "payment_confirmed",
            referenceType: "payment",
            referenceId: entryId,
            templateKey: "payment_confirmed_whatsapp",
            variables: {
              customer_name: cust?.full_name || customerName || "Cliente",
              paid_amount: paidAmount.toFixed(2),
              reference: reference || ref || entryId.slice(0, 8),
              payment_method: paymentMethodLabels[method],
              remaining_balance: newRemaining.toFixed(2),
            },
          });
        }
      } catch {
        // non-blocking
      }
    }

    onOpenChange(false);
    setAmount(remainingAmount.toString());
    setRef("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        {payments.length > 0 && (
          <div className="max-h-40 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.payment_date), "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-sm">{paymentMethodLabels[p.payment_method]}</TableCell>
                    <TableCell className="text-right text-sm font-medium">R$ {Number(p.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo restante:</span>
            <Badge variant="outline" className="font-mono">R$ {remainingAmount.toFixed(2)}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(paymentMethodLabels) as [PaymentMethod, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Referência</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Nº comprovante, NSU..." />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || parseFloat(amount) <= 0}>
            {createMutation.isPending ? "Registrando..." : "Registrar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
