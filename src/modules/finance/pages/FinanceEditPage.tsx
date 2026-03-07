import { useParams, useNavigate, Link } from "react-router-dom";
import { useFinancialEntry, useUpdateFinancialEntry } from "../hooks/useFinance";
import FinancialEntryForm from "../components/FinancialEntryForm";
import { FinancialEntryFormData } from "../types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useFinancialEntry(id);
  const updateMutation = useUpdateFinancialEntry();

  const handleSubmit = async (data: FinancialEntryFormData) => {
    await updateMutation.mutateAsync({ id: id!, data });
    navigate(`/finance/${id}`);
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!entry) return <p className="text-center py-12 text-muted-foreground">Não encontrado.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/finance/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar Lançamento</h1>
      </div>
      <FinancialEntryForm
        defaultValues={{
          entry_type: entry.entry_type,
          description: entry.description,
          amount: entry.amount,
          due_date: entry.due_date || "",
          category: entry.category || "",
          notes: entry.notes || "",
          service_order_id: entry.service_order_id || "",
          customer_id: entry.customer_id || "",
          supplier_id: entry.supplier_id || "",
          collection_point_id: entry.collection_point_id || "",
        }}
        onSubmit={handleSubmit}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
