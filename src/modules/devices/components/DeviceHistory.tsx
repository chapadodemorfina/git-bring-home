import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Loader2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { statusLabels, ServiceOrderStatus } from "@/modules/service-orders/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  deviceId: string;
}

export function DeviceHistory({ deviceId }: Props) {
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["device-history", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, order_number, status, priority, reported_issue, created_at, updated_at")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Ordens de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !orders?.length ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma ordem de serviço encontrada para este dispositivo.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate(`/service-orders/${o.id}`)}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {o.order_number}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {statusLabels[o.status as ServiceOrderStatus] || o.status}
                  </Badge>
                </div>
                {o.reported_issue && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{o.reported_issue}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
