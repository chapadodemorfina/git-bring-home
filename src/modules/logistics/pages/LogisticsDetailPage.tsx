import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePickupDelivery, useDeletePickupDelivery } from "../hooks/useLogistics";
import { statusLabels, statusColors, typeLabels, statusTransitions } from "../types";
import TransportTimeline from "../components/TransportTimeline";
import LogisticsStatusDialog from "../components/LogisticsStatusDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, RefreshCw, MapPin, User, Phone, Truck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSignedUrl } from "@/hooks/useSignedUrl";

export default function LogisticsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = usePickupDelivery(id);
  const deleteMutation = useDeletePickupDelivery();
  const [statusOpen, setStatusOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate("/logistics");
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  if (!item) return <p className="text-center py-12 text-muted-foreground">Solicitação não encontrada.</p>;

  const canChangeStatus = (statusTransitions[item.status] || []).length > 0;
  const proofUrl = useSignedUrl("service-order-attachments", item?.proof_storage_path);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" asChild><Link to="/logistics"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <h1 className="text-2xl font-bold">{typeLabels[item.logistics_type]}</h1>
            <Badge className={statusColors[item.status]}>{statusLabels[item.status]}</Badge>
          </div>
          <p className="text-muted-foreground ml-12">
            OS: <Link to={`/service-orders/${item.service_order_id}`} className="hover:underline font-medium">{item.order_number}</Link>
            {" · "}{item.customer_name}
            {" · "}Criado em {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canChangeStatus && (
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Alterar Status
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/logistics/${item.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Editar</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info Cards */}
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Contato</p>
                  <p className="font-medium">{item.contact_name || "—"}</p>
                  {item.contact_phone && <p className="text-sm text-muted-foreground">{item.contact_phone}</p>}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Motorista / Motoboy</p>
                  <p className="font-medium">{item.driver_name || "—"}</p>
                  {item.driver_phone && <p className="text-sm text-muted-foreground">{item.driver_phone}</p>}
                </div>
              </div>
              {item.scheduled_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Data Agendada</p>
                  <p className="font-medium">{format(new Date(item.scheduled_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              )}
              {item.completed_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Data Concluída</p>
                  <p className="font-medium">{format(new Date(item.completed_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          {item.address_street && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Endereço</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">
                  {item.address_street}{item.address_number ? `, ${item.address_number}` : ""}
                  {item.address_complement ? ` - ${item.address_complement}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[item.address_neighborhood, item.address_city, item.address_state].filter(Boolean).join(", ")}
                  {item.address_zip ? ` · CEP ${item.address_zip}` : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {item.notes && (
            <Card>
              <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{item.notes}</p></CardContent>
            </Card>
          )}

          {/* Proof */}
          {proofUrl && (
            <Card>
              <CardHeader><CardTitle>Comprovante</CardTitle></CardHeader>
              <CardContent>
                <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                  Ver comprovante
                </a>
                {item.proof_notes && <p className="text-sm text-muted-foreground mt-1">{item.proof_notes}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline */}
        <div>
          <Card>
            <CardHeader><CardTitle>Histórico de Transporte</CardTitle></CardHeader>
            <CardContent>
              <TransportTimeline pickupDeliveryId={item.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <LogisticsStatusDialog
        pickupDeliveryId={item.id}
        currentStatus={item.status}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </div>
  );
}
