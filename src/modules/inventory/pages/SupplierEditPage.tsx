import { useParams, useNavigate } from "react-router-dom";
import { useSupplier, useUpdateSupplier } from "../hooks/useInventory";
import SupplierForm from "../components/SupplierForm";

export default function SupplierEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id);
  const update = useUpdateSupplier();

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!supplier) return <p className="text-destructive">Fornecedor não encontrado.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Editar Fornecedor</h1>
      <SupplierForm
        defaultValues={supplier}
        isLoading={update.isPending}
        onSubmit={async (data) => {
          await update.mutateAsync({ id: id!, values: data });
          navigate(`/inventory/suppliers/${id}`);
        }}
      />
    </div>
  );
}
