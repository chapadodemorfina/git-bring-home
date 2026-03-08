import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const db = supabase as any;

const locationLabels: Record<string, string> = {
  reception: "Recepção",
  triage_bench: "Bancada Triagem",
  diagnosis_bench: "Bancada Diagnóstico",
  repair_bench: "Bancada Reparo",
  testing_bench: "Bancada Teste",
  storage: "Armazenamento",
  ready_storage: "Pronto p/ Retirada",
  delivered: "Entregue",
  unknown: "Desconhecido",
};

interface Props {
  serviceOrderId: string;
  deviceId: string | null;
}

export default function DeviceLocationPanel({ serviceOrderId, deviceId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [manualLocation, setManualLocation] = useState("");

  const { data: history } = useQuery({
    queryKey: ["device-location", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("device_location_tracking")
        .select("*")
        .eq("service_order_id", serviceOrderId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (location: string) => {
      const { error } = await db.from("device_location_tracking").insert({
        service_order_id: serviceOrderId,
        device_id: deviceId,
        location,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device-location", serviceOrderId] });
      setManualLocation("");
      toast({ title: "Localização atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const currentLocation = history?.[0]?.location;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Rastreamento do Dispositivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLocation && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Local atual:</span>
            <Badge variant="outline">{locationLabels[currentLocation] || currentLocation}</Badge>
          </div>
        )}

        <div className="flex gap-2">
          <Select value={manualLocation} onValueChange={setManualLocation}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Mover para..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(locationLabels).filter(([k]) => k !== "delivered" && k !== "unknown").map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!manualLocation || moveMutation.isPending}
            onClick={() => moveMutation.mutate(manualLocation)}
          >
            Mover
          </Button>
        </div>

        {history && history.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.map((h: any) => (
              <div key={h.id} className="flex justify-between text-xs text-muted-foreground border-b border-border py-1">
                <span>{locationLabels[h.location] || h.location}</span>
                <span>{format(new Date(h.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
