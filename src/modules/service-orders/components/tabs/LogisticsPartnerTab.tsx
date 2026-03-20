import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DeviceLocationPanel from "../DeviceLocationPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Building2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const db = supabase as any;

const transferStatusLabels: Record<string, string> = {
  pending_pickup: "Aguardando Coleta",
  in_transit_to_center: "Em Trânsito → Centro",
  received_at_center: "Recebido no Centro",
  in_transit_to_collection_point: "Em Trânsito → Ponto de Coleta",
  delivered_to_collection_point: "Entregue no Ponto",
  delivered_to_customer: "Entregue ao Cliente",
};

const transferStatusColors: Record<string, string> = {
  pending_pickup: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_transit_to_center: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  received_at_center: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_transit_to_collection_point: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delivered_to_collection_point: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  delivered_to_customer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

interface Props {
  serviceOrderId: string;
  deviceId: string | null;
  collectionPointId: string | null;
  collectionPointName: string | null;
}

export default function LogisticsPartnerTab({ serviceOrderId, deviceId, collectionPointId, collectionPointName }: Props) {
  const { data: transfers } = useQuery({
    queryKey: ["so-transfers", serviceOrderId],
    enabled: !!collectionPointId,
    queryFn: async () => {
      const { data, error } = await db
        .from("collection_transfers")
        .select("*")
        .eq("service_order_id", serviceOrderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: cpDetail } = useQuery({
    queryKey: ["cp-detail-tab", collectionPointId],
    enabled: !!collectionPointId,
    queryFn: async () => {
      const { data, error } = await db
        .from("collection_points")
        .select("name, company_name, phone, whatsapp, city, state, commission_type, commission_value")
        .eq("id", collectionPointId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const commissionTypeLabels: Record<string, string> = {
    percentage: "Percentual",
    fixed_per_order: "Fixo por OS",
    fixed_per_device: "Fixo por Dispositivo",
  };

  return (
    <div className="space-y-6">
      {/* Parceiro */}
      {collectionPointId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Ponto de Coleta Parceiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{cpDetail?.name || collectionPointName || "—"}</p>
                {cpDetail?.company_name && (
                  <p className="text-xs text-muted-foreground">{cpDetail.company_name}</p>
                )}
              </div>
              {cpDetail?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm">{cpDetail.phone}</p>
                </div>
              )}
              {cpDetail?.city && (
                <div>
                  <p className="text-xs text-muted-foreground">Localização</p>
                  <p className="text-sm">{cpDetail.city}{cpDetail.state ? ` / ${cpDetail.state}` : ""}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Comissão</p>
                <p className="text-sm">
                  {commissionTypeLabels[cpDetail?.commission_type] || cpDetail?.commission_type}
                  {" — "}
                  {cpDetail?.commission_type === "percentage"
                    ? `${cpDetail?.commission_value}%`
                    : `R$ ${Number(cpDetail?.commission_value || 0).toFixed(2)}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Esta OS não está vinculada a um Ponto de Coleta.</p>
            <p className="text-xs text-muted-foreground mt-1">OS recebida diretamente no centro técnico.</p>
          </CardContent>
        </Card>
      )}

      {/* Transferências */}
      {collectionPointId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Transferências
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!transfers?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma transferência registrada.
              </p>
            ) : (
              <div className="space-y-3">
                {transfers.map((t: any) => (
                  <div key={t.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={transferStatusColors[t.status] || "bg-muted text-muted-foreground"}>
                          {transferStatusLabels[t.status] || t.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t.direction === "to_center" ? "→ Centro Técnico" : "→ Ponto de Coleta"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {t.tracking_code && (
                      <p className="text-xs text-muted-foreground mt-1">Rastreio: {t.tracking_code}</p>
                    )}
                    {t.notes && <p className="text-xs mt-1">{t.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rastreamento do dispositivo */}
      <DeviceLocationPanel serviceOrderId={serviceOrderId} deviceId={deviceId} />
    </div>
  );
}
