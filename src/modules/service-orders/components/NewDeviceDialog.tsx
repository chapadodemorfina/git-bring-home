import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Loader2, Plus } from "lucide-react";
import { deviceTypeLabels, DeviceType } from "@/modules/devices/types";
import { useCreateDevice } from "@/modules/devices/hooks/useDevices";
import { useQueryClient } from "@tanstack/react-query";

const quickDeviceSchema = z.object({
  device_type: z.enum([
    "notebook", "desktop_pc", "monitor", "tv", "smartphone",
    "tablet", "printer", "electronic_module", "motherboard", "other",
  ] as const),
  custom_device_type: z.string().trim().max(100).optional().or(z.literal("")),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  model: z.string().trim().max(100).optional().or(z.literal("")),
  serial_number: z.string().trim().max(100).optional().or(z.literal("")),
  imei: z.string().trim().max(20).optional().or(z.literal("")),
  color: z.string().trim().max(50).optional().or(z.literal("")),
});

type QuickDeviceData = z.infer<typeof quickDeviceSchema>;

interface Props {
  customerId: string;
  onDeviceCreated: (deviceId: string) => void;
}

export default function NewDeviceDialog({ customerId, onDeviceCreated }: Props) {
  const [open, setOpen] = useState(false);
  const createDevice = useCreateDevice();
  const queryClient = useQueryClient();

  const form = useForm<QuickDeviceData>({
    resolver: zodResolver(quickDeviceSchema),
    defaultValues: {
      device_type: "smartphone",
      custom_device_type: "",
      brand: "",
      model: "",
      serial_number: "",
      imei: "",
      color: "",
    },
  });

  const deviceType = form.watch("device_type");
  const showImei = deviceType === "smartphone" || deviceType === "tablet";

  const onSubmit = async (data: QuickDeviceData) => {
    const device = await createDevice.mutateAsync({
      customer_id: customerId,
      device_type: data.device_type,
      custom_device_type: data.device_type === 'other' ? (data.custom_device_type || "") : "",
      brand: data.brand || "",
      model: data.model || "",
      serial_number: data.serial_number || "",
      imei: data.imei || "",
      color: data.color || "",
      password_notes: "",
      physical_condition: "",
      reported_issue: "",
      internal_notes: "",
      is_active: true,
    });
    // Wait for the devices list to refresh before setting the value
    await queryClient.invalidateQueries({ queryKey: ["devices-by-customer", customerId] });
    await queryClient.refetchQueries({ queryKey: ["devices-by-customer", customerId] });
    // Small delay to ensure React re-renders with new options
    await new Promise((r) => setTimeout(r, 100));
    onDeviceCreated(device.id);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Novo Dispositivo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Dispositivo</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => { e.stopPropagation(); form.handleSubmit(onSubmit)(e); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="device_type" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Tipo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.entries(deviceTypeLabels) as [DeviceType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {deviceType === "other" && (
                <FormField control={form.control} name="custom_device_type" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Especifique o Tipo *</FormLabel>
                    <FormControl><Input placeholder="Ex: Fonte, Drone, Scanner..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl><Input placeholder="Ex: Samsung" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl><Input placeholder="Ex: Galaxy S24" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="serial_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº de Série</FormLabel>
                  <FormControl><Input placeholder="S/N" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {showImei && (
                <FormField control={form.control} name="imei" render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMEI</FormLabel>
                    <FormControl><Input placeholder="IMEI" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl><Input placeholder="Cor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createDevice.isPending}>
                {createDevice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cadastrar e Vincular
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
