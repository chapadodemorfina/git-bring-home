import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FinancialEntryFormData, financialEntryFormSchema,
  revenueCategories, expenseCategories, FinancialEntryType,
} from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  defaultValues?: Partial<FinancialEntryFormData>;
  onSubmit: (data: FinancialEntryFormData) => void;
  isPending?: boolean;
}

export default function FinancialEntryForm({ defaultValues, onSubmit, isPending }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FinancialEntryFormData>({
    resolver: zodResolver(financialEntryFormSchema),
    defaultValues: { entry_type: "revenue", ...defaultValues },
  });

  const entryType = watch("entry_type") as FinancialEntryType;
  const categories = entryType === "expense" ? expenseCategories : revenueCategories;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Lançamento Financeiro</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={entryType} onValueChange={(v: any) => setValue("entry_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="commission">Comissão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={watch("category") || ""} onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descrição *</Label>
            <Input {...register("description")} placeholder="Descrição do lançamento" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" {...register("amount")} placeholder="0,00" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Vencimento</Label>
            <Input type="date" {...register("due_date")} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>
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
