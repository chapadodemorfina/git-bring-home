import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, Loader2, Monitor, User, AlertTriangle } from "lucide-react";
import { useDevice, useDeleteDevice } from "../hooks/useDevices";
import { deviceTypeLabels, getDeviceTypeLabel } from "../types";
import { AccessoryChecklist } from "../components/AccessoryChecklist";
import { DevicePhotos } from "../components/DevicePhotos";
import { DeviceHistory } from "../components/DeviceHistory";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Can } from "@/modules/permissions/components/Can";

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading } = useDevice(id);
  const deleteDevice = useDeleteDevice();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!device) return <p className="text-center py-12 text-muted-foreground">Dispositivo não encontrado</p>;

  const handleDelete = async () => {
    await deleteDevice.mutateAsync(id!);
    navigate("/devices");
  };

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate("/devices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {[device.brand, device.model].filter(Boolean).join(" ") || "Dispositivo"}
              </h1>
              <Badge variant={device.is_active ? "default" : "secondary"}>
                {device.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5" />
              {getDeviceTypeLabel(device)}
              {device.customer_name && (
                <>
                  <span className="mx-1">•</span>
                  <User className="h-3.5 w-3.5" />
                  <button
                    className="underline hover:text-foreground"
                    onClick={() => navigate(`/customers/${device.customer_id}`)}
                  >
                    {device.customer_name}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Can permission="devices.update" mode="hide">
            <Button variant="outline" onClick={() => navigate(`/devices/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          </Can>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir dispositivo?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="accessories">Acessórios</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoRow label="Tipo" value={getDeviceTypeLabel(device)} />
                <InfoRow label="Marca" value={device.brand} />
                <InfoRow label="Modelo" value={device.model} />
                <InfoRow label="Número de Série" value={device.serial_number} />
                <InfoRow label="IMEI" value={device.imei} />
                <InfoRow label="Cor" value={device.color} />
              </dl>
            </CardContent>
          </Card>

          {(device.reported_issue || device.physical_condition) && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Condição e Problema</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {device.reported_issue && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Defeito Relatado</dt>
                    <dd className="text-sm bg-muted/50 rounded-md p-3">{device.reported_issue}</dd>
                  </div>
                )}
                {device.physical_condition && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Condição Física</dt>
                    <dd className="text-sm bg-muted/50 rounded-md p-3">{device.physical_condition}</dd>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(device.password_notes || device.internal_notes) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {device.password_notes && <InfoRow label="Senha / Padrão" value={device.password_notes} />}
                {device.internal_notes && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-1">Observações Internas</dt>
                    <dd className="text-sm bg-muted/50 rounded-md p-3">{device.internal_notes}</dd>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="accessories">
          <AccessoryChecklist deviceId={id!} />
        </TabsContent>

        <TabsContent value="photos">
          <DevicePhotos deviceId={id!} />
        </TabsContent>

        <TabsContent value="history">
          <DeviceHistory deviceId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
