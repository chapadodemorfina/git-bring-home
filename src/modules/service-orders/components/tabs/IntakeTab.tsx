import { Link } from "react-router-dom";
import { ServiceOrder, ChecklistItem, checklistStatusLabels, checklistStatusColors } from "../../types";
import ValuesComparisonPanel from "../ValuesComparisonPanel";
import IntakePhotoUpload from "../IntakePhotoUpload";
import SignatureCapture from "../SignatureCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MonitorSmartphone, Calendar, MapPin, Package, AlertTriangle, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  order: ServiceOrder;
}

// Backwards-compat for old physical_condition JSON stored as text
const legacyLabelMap: Record<string, string> = {
  screen: "Tela/Display", body: "Carcaça/Estrutura", buttons: "Botões",
  charging: "Carregamento", battery: "Bateria", speakers: "Alto-falantes",
  camera: "Câmera", connectivity: "Rede/Wi-Fi", biometrics: "Biometria",
};

function renderChecklistItems(items: ChecklistItem[]) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <p key={item.id} className="flex items-center gap-1.5 text-sm">
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${checklistStatusColors[item.status] || "bg-muted-foreground"}`} />
          <span className="font-medium">{item.label || legacyLabelMap[item.id] || item.id}:</span>
          <span>{checklistStatusLabels[item.status] || item.status}</span>
          {item.notes && <span className="text-muted-foreground">({item.notes})</span>}
        </p>
      ))}
    </div>
  );
}

function renderChecklist(raw: string | ChecklistItem[] | null) {
  if (!raw) return null;
  if (Array.isArray(raw)) return renderChecklistItems(raw);
  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items)) return renderChecklistItems(items);
    return <p className="text-sm">{raw}</p>;
  } catch {
    return <p className="text-sm">{String(raw)}</p>;
  }
}

export default function IntakeTab({ order }: Props) {
  // Prefer new intake_checklist JSONB field, fallback to legacy physical_condition
  const checklistData = order.intake_checklist || order.physical_condition;

  return (
    <div className="space-y-6">
      {/* Cliente & Dispositivo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cliente e Dispositivo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <Link to={`/customers/${order.customer_id}`} className="font-medium hover:underline">
                {order.customer_name}
              </Link>
              {order.customer_phone && <p className="text-xs text-muted-foreground">{order.customer_phone}</p>}
              {order.customer_document && <p className="text-xs text-muted-foreground">{order.customer_document}</p>}
            </div>
          </div>

          {order.device_id && (
            <div className="flex items-start gap-3">
              <MonitorSmartphone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Dispositivo</p>
                <Link to={`/devices/${order.device_id}`} className="font-medium hover:underline">
                  {order.device_label || "Ver dispositivo"}
                </Link>
                {order.device_serial && <p className="text-xs text-muted-foreground">S/N: {order.device_serial}</p>}
                {order.device_imei && <p className="text-xs text-muted-foreground">IMEI: {order.device_imei}</p>}
                {order.device_color && <p className="text-xs text-muted-foreground">Cor: {order.device_color}</p>}
              </div>
            </div>
          )}

          {order.expected_deadline && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Prazo Estimado</p>
                <p className="font-medium">{format(new Date(order.expected_deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>
          )}

          {order.collection_point_name && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Ponto de Coleta</p>
                <p className="font-medium">{order.collection_point_name}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Defeito e Condição */}
      <Card>
        <CardHeader><CardTitle className="text-base">Problema e Condição Física</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {order.reported_issue ? (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Defeito Relatado</p>
              </div>
              <p className="text-sm">{order.reported_issue}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum defeito relatado.</p>
          )}

          {checklistData && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Checklist de Entrada</p>
              {renderChecklist(checklistData)}
            </div>
          )}

          {order.accessories_received && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Acessórios Recebidos</p>
              </div>
              <p className="text-sm">{order.accessories_received}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      {(order.intake_notes || order.internal_notes) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.intake_notes && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Observações de Entrada</p>
                </div>
                <p className="text-sm">{order.intake_notes}</p>
              </div>
            )}
            {order.internal_notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Notas Internas</p>
                <p className="text-sm bg-muted p-2 rounded">{order.internal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo de Valores */}
      <ValuesComparisonPanel
        serviceOrderId={order.id}
        totalAmount={order.total_amount}
        estimatedValue={order.estimated_value}
      />
    </div>
  );
}
