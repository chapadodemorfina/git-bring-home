import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, Stethoscope, Wrench, TestTube, Package, User } from "lucide-react";
import { useWorkQueues, type WorkQueueItem } from "@/hooks/useWorkQueues";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { key: "diagnosis" as const, label: "Diagnóstico", icon: Stethoscope, color: "border-t-blue-500" },
  { key: "repair" as const, label: "Reparo", icon: Wrench, color: "border-t-amber-500" },
  { key: "testing" as const, label: "Testes", icon: TestTube, color: "border-t-violet-500" },
  { key: "pickup" as const, label: "Retirada", icon: Package, color: "border-t-emerald-500" },
];

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  normal: "bg-blue-500",
  low: "bg-muted-foreground/50",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

function KanbanCard({ item }: { item: WorkQueueItem }) {
  const navigate = useNavigate();

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-l-4",
        item.sla_overdue ? "border-l-destructive" : "border-l-transparent"
      )}
      onClick={() => navigate(`/service-orders/${item.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-foreground">
            {item.order_number}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[item.priority])} />
            <span className="text-[10px] text-muted-foreground">{PRIORITY_LABEL[item.priority]}</span>
          </div>
        </div>

        <p className="text-sm font-medium truncate">{item.customer_name}</p>

        {item.device_label && (
          <p className="text-xs text-muted-foreground truncate">{item.device_label}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{Math.round(item.hours_in_status)}h</span>
            {item.sla_overdue && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px] gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                SLA
              </Badge>
            )}
          </div>

          {item.technician_name ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[100px]">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.technician_name}</span>
            </div>
          ) : (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">Sem técnico</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  queueKey,
  label,
  icon: Icon,
  color,
  priority,
}: {
  queueKey: "diagnosis" | "repair" | "testing" | "pickup";
  label: string;
  icon: React.ElementType;
  color: string;
  priority: string | null;
}) {
  const { data, isLoading } = useWorkQueues(queueKey, null, priority, false, 1, 100);

  return (
    <div className={cn("flex flex-col min-w-[280px] max-w-[320px] flex-1 rounded-lg border border-t-4 bg-muted/30", color)}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{label}</span>
        <Badge variant="secondary" className="ml-auto h-5 text-xs">
          {isLoading ? "…" : data?.total ?? 0}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(100vh - 240px)" }}>
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          ) : !data?.items?.length ? (
            <p className="text-center text-xs text-muted-foreground py-8">Fila vazia</p>
          ) : (
            data.items.map((item) => <KanbanCard key={item.id} item={item} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function KanbanBoard({ priority }: { priority: string | null }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.key}
          queueKey={col.key}
          label={col.label}
          icon={col.icon}
          color={col.color}
          priority={priority}
        />
      ))}
    </div>
  );
}
