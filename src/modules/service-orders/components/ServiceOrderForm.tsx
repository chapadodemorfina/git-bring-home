import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ServiceOrderFormData, serviceOrderSchema, priorityLabels, channelLabels, ServiceOrder } from "../types";
import { useCreateServiceOrder, useUpdateServiceOrder } from "../hooks/useServiceOrders";
import { useDevicesByCustomer } from "@/modules/devices/hooks/useDevices";
import { deviceTypeLabels } from "@/modules/devices/types";
import { useTechniciansList } from "@/modules/users/hooks/useUsers";
import { CustomerSearch } from "@/modules/devices/components/CustomerSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Save, ArrowLeft } from "lucide-react";
import { useState } from "react";

interface Props {
  initialData?: ServiceOrder;
}

export default function ServiceOrderForm({ initialData }: Props) {
  const navigate = useNavigate();
  const createMutation = useCreateServiceOrder();
  const updateMutation = useUpdateServiceOrder();
  const isEdit = !!initialData;

  const form = useForm<ServiceOrderFormData>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      customer_id: initialData?.customer_id || "",
      device_id: initialData?.device_id || "",
      priority: initialData?.priority || "normal",
      intake_channel: initialData?.intake_channel || "front_desk",
      reported_issue: initialData?.reported_issue || "",
      physical_condition: initialData?.physical_condition || "",
      accessories_received: initialData?.accessories_received || "",
      intake_notes: initialData?.intake_notes || "",
      internal_notes: initialData?.internal_notes || "",
      expected_deadline: initialData?.expected_deadline ? initialData.expected_deadline.slice(0, 16) : "",
      assigned_technician_id: initialData?.assigned_technician_id || "",
    },
  });

  const customerId = form.watch("customer_id");
  const { data: customerDevices } = useDevicesByCustomer(customerId || undefined);

  const onSubmit = async (data: ServiceOrderFormData) => {
    if (isEdit) {
      await updateMutation.mutateAsync({ id: initialData!.id, data });
      navigate(`/service-orders/${initialData!.id}`);
    } else {
      const so = await createMutation.mutateAsync(data);
      navigate(`/service-orders/${so.id}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer & Device */}
        <Card>
          <CardHeader><CardTitle>Cliente e Dispositivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="customer_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente *</FormLabel>
                <FormControl>
                  <CustomerSearch value={field.value} onChange={(id) => {
                    field.onChange(id);
                    form.setValue("device_id", "");
                  }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {customerId && (
              <FormField control={form.control} name="device_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dispositivo</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione um dispositivo (opcional)" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customerDevices?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {deviceTypeLabels[d.device_type]} — {d.brand} {d.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card>
          <CardHeader><CardTitle>Detalhes da Ordem</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="intake_channel" render={({ field }) => (
              <FormItem>
                <FormLabel>Canal de Entrada</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(channelLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="expected_deadline" render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo Estimado</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Issue & Condition */}
        <Card>
          <CardHeader><CardTitle>Problema e Condição</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="reported_issue" render={({ field }) => (
              <FormItem>
                <FormLabel>Problema Relatado</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Descreva o problema informado pelo cliente..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="physical_condition" render={({ field }) => (
              <FormItem>
                <FormLabel>Condição Física</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Riscos, amassados, tela trincada..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="accessories_received" render={({ field }) => (
              <FormItem>
                <FormLabel>Acessórios Recebidos</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Carregador, cabo, case..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="intake_notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações de Entrada</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Notas visíveis no comprovante..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="internal_notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notas Internas</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Notas internas da equipe..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/service-orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" /> {isEdit ? "Salvar Alterações" : "Criar Ordem de Serviço"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
