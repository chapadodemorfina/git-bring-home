import { useCustomerByAuth, usePortalLogistics } from "../hooks/usePortal";
import { statusLabels, statusColors } from "@/modules/logistics/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  pickup: "Coleta",
  delivery: "Entrega",
  collection_point_transfer: "Transferência",
};

export default function PortalLogisticsPage() {
  const { data: customer, isLoading: custLoading } = useCustomerByAuth();
  const { data: logistics, isLoading } = usePortalLogistics(customer?.id);

  if (custLoading || isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logística</h1>
        <p className="text-muted-foreground">Acompanhe coletas e entregas</p>
      </div>

      {!logistics?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma movimentação logística encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(logistics as any[]).map((item) => (
            <Card key={item.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{typeLabels[item.logistics_type] || item.logistics_type}</span>
                        <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                          {statusLabels[item.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">OS: {item.order_number}</p>
                      {item.driver_name && (
                        <p className="text-xs text-muted-foreground">Motorista: {item.driver_name}</p>
                      )}
                      {item.address_street && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {item.address_street}{item.address_number ? `, ${item.address_number}` : ""} - {item.address_city}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
