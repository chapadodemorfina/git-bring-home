import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PickupDeliveryFormData, pickupDeliveryFormSchema, typeLabels } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  defaultValues?: Partial<PickupDeliveryFormData>;
  onSubmit: (data: PickupDeliveryFormData) => void;
  isPending?: boolean;
  serviceOrders?: { id: string; order_number: string; customer_name?: string }[];
}

export default function PickupDeliveryForm({ defaultValues, onSubmit, isPending, serviceOrders }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PickupDeliveryFormData>({
    resolver: zodResolver(pickupDeliveryFormSchema),
    defaultValues: {
      logistics_type: "pickup",
      ...defaultValues,
    },
  });

  const logisticsType = watch("logistics_type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Informações da Logística</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ordem de Serviço *</Label>
            {serviceOrders ? (
              <Select
                value={watch("service_order_id")}
                onValueChange={(v) => setValue("service_order_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OS" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOrders.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.order_number} - {so.customer_name || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input {...register("service_order_id")} placeholder="ID da OS" />
            )}
            {errors.service_order_id && <p className="text-xs text-destructive">{errors.service_order_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={logisticsType} onValueChange={(v: any) => setValue("logistics_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(typeLabels) as [string, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contato (Nome)</Label>
            <Input {...register("contact_name")} />
          </div>
          <div className="space-y-2">
            <Label>Contato (Telefone)</Label>
            <Input {...register("contact_phone")} />
          </div>
          <div className="space-y-2">
            <Label>Motorista / Motoboy</Label>
            <Input {...register("driver_name")} />
          </div>
          <div className="space-y-2">
            <Label>Telefone Motorista</Label>
            <Input {...register("driver_phone")} />
          </div>

          <div className="space-y-2">
            <Label>Data Solicitada</Label>
            <Input type="datetime-local" {...register("requested_date")} />
          </div>
          <div className="space-y-2">
            <Label>Data Agendada</Label>
            <Input type="datetime-local" {...register("scheduled_date")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Rua</Label>
            <Input {...register("address_street")} />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input {...register("address_number")} />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input {...register("address_complement")} />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input {...register("address_neighborhood")} />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input {...register("address_city")} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input {...register("address_state")} maxLength={2} />
          </div>
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input {...register("address_zip")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
        <CardContent>
          <Textarea {...register("notes")} rows={3} placeholder="Observações adicionais..." />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
