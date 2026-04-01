import { useNavigate } from "react-router-dom";
import { useCreateFinancialEntry } from "../hooks/useFinance";
import FinancialEntryForm from "../components/FinancialEntryForm";
import { FinancialEntryFormData } from "../types";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";

export default function FinanceCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateFinancialEntry();
  const { loading: tenantLoading, activeTenant } = useTenant();

  const handleSubmit = async (data: FinancialEntryFormData) => {
    const result = await createMutation.mutateAsync(data);
    navigate(`/finance/${result.id}`);
  };

  if (tenantLoading || !activeTenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
