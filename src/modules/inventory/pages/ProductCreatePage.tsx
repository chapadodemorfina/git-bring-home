import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductForm from "../components/ProductForm";
import { useCreateProduct } from "../hooks/useInventory";

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const create = useCreateProduct();

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Novo Produto</CardTitle></CardHeader>
        <CardContent>
          <ProductForm
            isLoading={create.isPending}
            onSubmit={async (data) => {
              const result = await create.mutateAsync(data);
              navigate(`/inventory/products/${result.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
