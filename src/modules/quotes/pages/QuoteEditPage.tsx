import { useNavigate, useParams } from "react-router-dom";
import { useCommercialQuote, useUpdateCommercialQuote } from "../hooks/useQuotes";
import QuoteForm from "../components/QuoteForm";
import type { QuoteFormData } from "../types";

export default function QuoteEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useCommercialQuote(id);
  const update = useUpdateCommercialQuote();

  if (isLoading) return <p className="p-8 text-muted-foreground">Carregando...</p>;
  if (!quote) return <p className="p-8 text-destructive">Orçamento não encontrado.</p>;

  const defaultValues: Partial<QuoteFormData> = {
    customer_id: quote.customer_id || "",
    device_id: quote.device_id || "",
    service_order_id: quote.service_order_id || "",
    title: quote.title,
    description: quote.description || "",
    valid_until: quote.valid_until || "",
    discount_amount: Number(quote.discount_amount),
  };

  const handleSubmit = async (data: QuoteFormData) => {
    await update.mutateAsync({ id: id!, data });
    navigate(`/quotes/${id}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Editar Orçamento</h1>
        <p className="text-sm text-muted-foreground">{quote.quote_number}</p>
      </div>
      <QuoteForm defaultValues={defaultValues} onSubmit={handleSubmit} isSubmitting={update.isPending} />
    </div>
  );
}
