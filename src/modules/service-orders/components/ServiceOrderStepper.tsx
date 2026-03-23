import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { ServiceOrderStatus } from "../types";

const steps = [
  { label: "Entrada", statuses: ["received", "triage"] },
  { label: "Diagnóstico", statuses: ["awaiting_diagnosis", "awaiting_quote"] },
  { label: "Aprovação", statuses: ["awaiting_customer_approval", "awaiting_parts"] },
  { label: "Execução", statuses: ["in_repair", "in_testing"] },
  { label: "Entrega", statuses: ["ready_for_pickup", "delivered"] },
];

const statusOrder: ServiceOrderStatus[] = [
  "received", "triage", "awaiting_diagnosis", "awaiting_quote",
  "awaiting_customer_approval", "awaiting_parts", "in_repair",
  "in_testing", "ready_for_pickup", "delivered",
];

function getStepIndex(status: string): number {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].statuses.includes(status)) return i;
  }
  return -1;
}

interface Props {
  currentStatus: string;
}

export default function ServiceOrderStepper({ currentStatus }: Props) {
  const isCancelled = currentStatus === "cancelled";
  const isWarranty = currentStatus === "warranty_return";
  const activeStep = getStepIndex(currentStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
        <div className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center">
          <span className="text-destructive-foreground text-xs font-bold">✕</span>
        </div>
        <span className="text-sm font-medium text-destructive">OS Cancelada</span>
      </div>
    );
  }

  if (isWarranty) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">↩</span>
        </div>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Retorno de Garantia</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full overflow-x-auto scrollbar-hide gap-0">
      {steps.map((step, i) => {
        const isCompleted = i < activeStep;
        const isActive = i === activeStep;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-[56px]">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors shrink-0",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isActive && "border-primary bg-primary/10 text-primary",
                  !isCompleted && !isActive && "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs text-center leading-tight whitespace-nowrap",
                  isActive && "font-semibold text-primary",
                  isCompleted && "text-foreground",
                  !isCompleted && !isActive && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 rounded-full min-w-[12px]",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
