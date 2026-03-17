import { cn } from "@/lib/utils";
import { Check, Package, Search, FileText, Clock, Wrench, TestTube, Gift, Truck } from "lucide-react";

// Simplified customer-facing stages (not all internal statuses)
const STAGES = [
  { key: "received", label: "Recebido", icon: Package },
  { key: "diagnosis", label: "Diagnóstico", icon: Search },
  { key: "quote", label: "Orçamento", icon: FileText },
  { key: "approval", label: "Aprovação", icon: Clock },
  { key: "repair", label: "Reparo", icon: Wrench },
  { key: "testing", label: "Testes", icon: TestTube },
  { key: "ready", label: "Pronto", icon: Gift },
  { key: "delivered", label: "Entregue", icon: Truck },
] as const;

// Map internal statuses to customer-facing stages
function getStageIndex(status: string): number {
  switch (status) {
    case "received":
    case "triage":
      return 0;
    case "awaiting_diagnosis":
      return 1;
    case "awaiting_quote":
      return 2;
    case "awaiting_customer_approval":
      return 3;
    case "awaiting_parts":
    case "in_repair":
      return 4;
    case "in_testing":
      return 5;
    case "ready_for_pickup":
      return 6;
    case "delivered":
      return 7;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

interface OrderProgressStepperProps {
  currentStatus: string;
}

export default function OrderProgressStepper({ currentStatus }: OrderProgressStepperProps) {
  const currentIndex = getStageIndex(currentStatus);

  if (currentStatus === "cancelled") {
    return (
      <div className="flex items-center justify-center py-6 text-destructive">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
            <span className="text-lg font-bold">✕</span>
          </div>
          <p className="font-medium text-sm">Serviço Cancelado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start justify-between relative">
        {/* Connection line */}
        <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-border" />
        <div
          className="absolute top-5 left-[5%] h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${Math.min((currentIndex / (STAGES.length - 1)) * 90, 90)}%` }}
        />

        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10" style={{ width: `${100 / STAGES.length}%` }}>
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 border-primary text-primary ring-4 ring-primary/20",
                  !isCompleted && !isCurrent && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1.5 text-center leading-tight",
                  isCurrent ? "font-semibold text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical compact */}
      <div className="sm:hidden space-y-1">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          // On mobile, only show completed, current, and next
          if (isFuture && i > currentIndex + 1) return null;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary/10 border-primary text-primary ring-2 ring-primary/20",
                    isFuture && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                {i < Math.min(currentIndex + 1, STAGES.length - 1) && (
                  <div className={cn("w-0.5 h-4", isCompleted ? "bg-primary" : "bg-border")} />
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isCurrent ? "font-semibold text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stage.label}
                {isCurrent && <span className="ml-2 text-xs font-normal text-muted-foreground">← Atual</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
