import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductForm from "../components/ProductForm";
import { useProduct, useUpdateProduct } from "../hooks/useInventory";

export default function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const update = useUpdateProduct();

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!product) return <p className="text-destructive">Produto não encontrado.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Editar Produto — {product.sku}</CardTitle></CardHeader>
        <CardContent>
          <ProductForm
            isLoading={update.isPending}
            defaultValues={{
              sku: product.sku,
              name: product.name,
              category: product.category || "",
              brand: product.brand || "",
              compatible_devices: product.compatible_devices || "",
              cost_price: product.cost_price,
              sale_price: product.sale_price,
              quantity: product.quantity,
              minimum_quantity: product.minimum_quantity,
              supplier_id: product.supplier_id || "",
              location: product.location || "",
              notes: product.notes || "",
            }}
            onSubmit={async (data) => {
              await update.mutateAsync({ id: id!, values: data });
              navigate(`/inventory/products/${id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
