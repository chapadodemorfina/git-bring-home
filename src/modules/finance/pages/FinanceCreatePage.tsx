import { useNavigate } from "react-router-dom";
import { useCreateFinancialEntry } from "../hooks/useFinance";
import FinancialEntryForm from "../components/FinancialEntryForm";
import { FinancialEntryFormData } from "../types";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function FinanceCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateFinancialEntry();

  const handleSubmit = async (data: FinancialEntryFormData) => {
    const result = await createMutation.mutateAsync(data);
    navigate(`/finance/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/finance"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Novo Lançamento</h1>
      </div>
      <FinancialEntryForm onSubmit={handleSubmit} isPending={createMutation.isPending} />
    </div>
  );
}
