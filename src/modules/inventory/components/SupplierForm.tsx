import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supplierSchema, supplierTypes, type SupplierFormData } from "../types";

interface Props {
  defaultValues?: Partial<SupplierFormData>;
  onSubmit: (data: SupplierFormData) => void;
  isLoading?: boolean;
}

export default function SupplierForm({ defaultValues, onSubmit, isLoading }: Props) {
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "", contact_name: "", email: "", phone: "", whatsapp: "",
      document: "", address: "", city: "", state: "", country: "Brasil",
      supplier_type: "distribuidor_local", lead_time_days: 7, notes: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="contact_name" render={({ field }) => (
            <FormItem><FormLabel>Contato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="whatsapp" render={({ field }) => (
            <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="supplier_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  {supplierTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="lead_time_days" render={({ field }) => (
            <FormItem><FormLabel>Lead Time (dias)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="document" render={({ field }) => (
            <FormItem><FormLabel>CNPJ/CPF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="state" render={({ field }) => (
            <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="country" render={({ field }) => (
            <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar Fornecedor"}</Button>
        </div>
      </form>
    </Form>
  );
}
