import { useTransportEvents } from "../hooks/useLogistics";
import { statusLabels, statusColors } from "../types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  pickupDeliveryId: string;
}

export default function TransportTimeline({ pickupDeliveryId }: Props) {
  const { data: events, isLoading } = useTransportEvents(pickupDeliveryId);

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  if (!events?.length) return <div className="text-sm text-muted-foreground">Nenhum evento registrado.</div>;

  return (
    <div className="relative space-y-4">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {event.from_status && (
                <>
                  <Badge className={statusColors[event.from_status]}>{statusLabels[event.from_status]}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </>
              )}
              <Badge className={statusColors[event.to_status]}>{statusLabels[event.to_status]}</Badge>
            </div>
            {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
