import { useState } from "react";
import { useChangeLogisticsStatus, useUploadProof } from "../hooks/useLogistics";
import { LogisticsStatus, statusLabels, statusTransitions } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  pickupDeliveryId: string;
  currentStatus: LogisticsStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const requiresProof: LogisticsStatus[] = ["picked_up", "returned"];

export default function LogisticsStatusDialog({ pickupDeliveryId, currentStatus, open, onOpenChange }: Props) {
  const [toStatus, setToStatus] = useState<LogisticsStatus | "">("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState("");
  const changeMutation = useChangeLogisticsStatus();
  const uploadMutation = useUploadProof();
  const qc = useQueryClient();
  const nextStatuses = statusTransitions[currentStatus] || [];

  const needsProof = requiresProof.includes(toStatus as LogisticsStatus);

  const handleSubmit = async () => {
    if (!toStatus) return;

    let proofPath: string | undefined;
    if (proofFile) {
      proofPath = await uploadMutation.mutateAsync({ id: pickupDeliveryId, file: proofFile });
    }

    await changeMutation.mutateAsync({
      id: pickupDeliveryId,
      fromStatus: currentStatus,
      toStatus: toStatus as LogisticsStatus,
      notes: notes || undefined,
      proofPath,
      proofNotes: proofNotes || undefined,
    });

    qc.invalidateQueries({ queryKey: ["pickup-delivery", pickupDeliveryId] });
    onOpenChange(false);
    setToStatus("");
    setNotes("");
    setProofFile(null);
    setProofNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Status Logístico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Próximo Status</Label>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  variant={toStatus === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setToStatus(s)}
                >
                  {statusLabels[s]}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {needsProof && (
            <>
              <div className="space-y-2">
                <Label>Comprovante (foto/arquivo) *</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>Notas do Comprovante</Label>
                <Textarea value={proofNotes} onChange={(e) => setProofNotes(e.target.value)} rows={2} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!toStatus || changeMutation.isPending || uploadMutation.isPending}
          >
            {changeMutation.isPending ? "Atualizando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
