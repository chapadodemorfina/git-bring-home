import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { DeviceFormData, deviceSchema, deviceTypeLabels, DeviceType } from "../types";
import { CustomerSearch } from "./CustomerSearch";

interface DeviceFormProps {
  defaultValues?: Partial<DeviceFormData>;
  onSubmit: (data: DeviceFormData) => Promise<any>;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

export function DeviceForm({ defaultValues, onSubmit, isSubmitting, isEdit }: DeviceFormProps) {
  const navigate = useNavigate();

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      customer_id: "",
      device_type: "notebook",
      brand: "",
      model: "",
      serial_number: "",
      imei: "",
      color: "",
      password_notes: "",
      physical_condition: "",
      reported_issue: "",
      internal_notes: "",
      is_active: true,
      ...defaultValues,
    },
  });

  const deviceType = form.watch("device_type");
  const showImei = deviceType === "smartphone" || deviceType === "tablet";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer + Device Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="customer_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente *</FormLabel>
                <FormControl>
                  <CustomerSearch value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="device_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Dispositivo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.entries(deviceTypeLabels) as [DeviceType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {deviceType === "other" && (
              <FormField control={form.control} name="custom_device_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Especifique o Tipo *</FormLabel>
                  <FormControl><Input placeholder="Ex: Fonte, Drone, Scanner..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="brand" render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl><Input placeholder="Ex: Dell, Samsung..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="model" render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl><Input placeholder="Ex: Inspiron 15..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="serial_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Série</FormLabel>
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
                <FormControl><Input placeholder="Cor do dispositivo" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex items-center gap-3 pt-6">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Ativo</FormLabel>
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Condition & Issue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condição e Problema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="reported_issue" render={({ field }) => (
              <FormItem>
                <FormLabel>Defeito Relatado</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Descreva o problema relatado pelo cliente..." {...field} /></FormControl>
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

            <FormField control={form.control} name="password_notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Senha / Padrão de Desbloqueio</FormLabel>
                <FormControl><Input placeholder="PIN, padrão ou senha" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Internal notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField control={form.control} name="internal_notes" render={({ field }) => (
              <FormItem>
                <FormControl><Textarea rows={3} placeholder="Notas internas da equipe..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
