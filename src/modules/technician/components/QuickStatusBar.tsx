import { Button } from "@/components/ui/button";
import { useChangeStatus } from "@/modules/service-orders/hooks/useServiceOrders";
import { statusTransitions, statusLabels, ServiceOrderStatus } from "@/modules/service-orders/types";
import { ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  orderId: string;
  currentStatus: ServiceOrderStatus;
}

// Technician-relevant quick transitions
const techStatuses: ServiceOrderStatus[] = [
  "triage", "awaiting_diagnosis", "awaiting_quote",
  "in_repair", "awaiting_parts", "in_testing", "ready_for_pickup",
];

export default function QuickStatusBar({ orderId, currentStatus }: Props) {
  const changeMutation = useChangeStatus();
  const [confirming, setConfirming] = useState<ServiceOrderStatus | null>(null);

  const allowed = (statusTransitions[currentStatus] || []).filter(
    (s) => techStatuses.includes(s)
  );

  if (allowed.length === 0) return null;

  const handleClick = (toStatus: ServiceOrderStatus) => {
    if (confirming === toStatus) {
      changeMutation.mutate(
        { id: orderId, fromStatus: currentStatus, toStatus, notes: "Atualizado via painel técnico" },
        { onSettled: () => setConfirming(null) }
      );
    } else {
      setConfirming(toStatus);
      setTimeout(() => setConfirming(null), 3000);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Avançar para:</p>
      <div className="flex flex-wrap gap-2">
        {allowed.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={confirming === s ? "default" : "outline"}
            disabled={changeMutation.isPending}
            onClick={() => handleClick(s)}
            className="text-xs"
          >
            {changeMutation.isPending && confirming === s ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            {confirming === s ? "Confirmar?" : statusLabels[s]}
          </Button>
        ))}
      </div>
    </div>
  );
}
