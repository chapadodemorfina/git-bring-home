import { useNavigate } from "react-router-dom";
import { useCreatePickupDelivery } from "../hooks/useLogistics";
import { useServiceOrders } from "@/modules/service-orders/hooks/useServiceOrders";
import PickupDeliveryForm from "../components/PickupDeliveryForm";
import { PickupDeliveryFormData } from "../types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function LogisticsCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreatePickupDelivery();
  const { data: serviceOrders } = useServiceOrders();

  const handleSubmit = async (data: PickupDeliveryFormData) => {
    const result = await createMutation.mutateAsync(data);
    navigate(`/logistics/${result.id}`);
  };

  const soOptions = serviceOrders?.map((so) => ({
    id: so.id,
    order_number: so.order_number,
    customer_name: so.customer_name,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/logistics"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Nova Solicitação Logística</h1>
      </div>
      <PickupDeliveryForm
        onSubmit={handleSubmit}
        isPending={createMutation.isPending}
        serviceOrders={soOptions}
      />
    </div>
  );
}
