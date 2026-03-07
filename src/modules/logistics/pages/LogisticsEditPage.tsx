import { useParams, useNavigate, Link } from "react-router-dom";
import { usePickupDelivery, useUpdatePickupDelivery } from "../hooks/useLogistics";
import { useServiceOrders } from "@/modules/service-orders/hooks/useServiceOrders";
import PickupDeliveryForm from "../components/PickupDeliveryForm";
import { PickupDeliveryFormData } from "../types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogisticsEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = usePickupDelivery(id);
  const updateMutation = useUpdatePickupDelivery();
  const { data: serviceOrders } = useServiceOrders();

  const handleSubmit = async (data: PickupDeliveryFormData) => {
    await updateMutation.mutateAsync({ id: id!, data });
    navigate(`/logistics/${id}`);
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!item) return <p className="text-center py-12 text-muted-foreground">Não encontrado.</p>;

  const soOptions = serviceOrders?.map((so) => ({
    id: so.id,
    order_number: so.order_number,
    customer_name: so.customer_name,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/logistics/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar Solicitação</h1>
      </div>
      <PickupDeliveryForm
        defaultValues={{
          service_order_id: item.service_order_id,
          logistics_type: item.logistics_type,
          contact_name: item.contact_name || "",
          contact_phone: item.contact_phone || "",
          driver_name: item.driver_name || "",
          driver_phone: item.driver_phone || "",
          address_street: item.address_street || "",
          address_number: item.address_number || "",
          address_complement: item.address_complement || "",
          address_neighborhood: item.address_neighborhood || "",
          address_city: item.address_city || "",
          address_state: item.address_state || "",
          address_zip: item.address_zip || "",
          requested_date: item.requested_date || "",
          scheduled_date: item.scheduled_date || "",
          notes: item.notes || "",
        }}
        onSubmit={handleSubmit}
        isPending={updateMutation.isPending}
        serviceOrders={soOptions}
      />
    </div>
  );
}
