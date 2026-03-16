import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCustomer } from "@/modules/customers/hooks/useCustomers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UserPlus } from "lucide-react";

const quickCustomerSchema = z.object({
  type: z.enum(["individual", "business"]),
  full_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  document: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
});

type QuickCustomerForm = z.infer<typeof quickCustomerSchema>;

interface Props {
  onCustomerCreated: (id: string, name: string) => void;
}

export default function NewCustomerDialog({ onCustomerCreated }: Props) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateCustomer();

  const form = useForm<QuickCustomerForm>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: {
      type: "individual",
      full_name: "",
      document: "",
      phone: "",
      whatsapp: "",
      email: "",
    },
  });

  const onSubmit = async (data: QuickCustomerForm) => {
    const customer = await createMutation.mutateAsync({
      ...data,
      notes: "",
      is_active: true,
    });
    onCustomerCreated(customer.id, customer.full_name);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UserPlus className="mr-1 h-4 w-4" /> Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                    <SelectItem value="business">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="document" render={({ field }) => (
              <FormItem>
                <FormLabel>CPF / CNPJ</FormLabel>
                <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="whatsapp" render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl><Input type="email" placeholder="cliente@email.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <UserPlus className="mr-1 h-4 w-4" /> Cadastrar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
