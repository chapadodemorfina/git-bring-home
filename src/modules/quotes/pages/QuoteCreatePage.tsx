import { useNavigate, useSearchParams } from "react-router-dom";
import { useCreateCommercialQuote } from "../hooks/useQuotes";
import QuoteForm from "../components/QuoteForm";
import type { QuoteFormData } from "../types";

export default function QuoteCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const create = useCreateCommercialQuote();

  const defaultValues: Partial<QuoteFormData> = {
    customer_id: searchParams.get("customer_id") || "",
    service_order_id: searchParams.get("service_order_id") || "",
    device_id: searchParams.get("device_id") || "",
    title: "",
    description: "",
    discount_amount: 0,
  };

  const handleSubmit = async (data: QuoteFormData) => {
    const result = await create.mutateAsync(data);
    navigate(`/quotes/${result.id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Novo Orçamento</h1>
        <p className="text-sm text-muted-foreground">Crie uma proposta comercial</p>
      </div>
      <QuoteForm defaultValues={defaultValues} onSubmit={handleSubmit} isSubmitting={create.isPending} />
    </div>
  );
}
