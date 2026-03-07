import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, PackagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProduct } from "../hooks/useInventory";
import StockMovementsTable from "../components/StockMovementsTable";
import StockEntryDialog from "../components/StockEntryDialog";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const [showEntry, setShowEntry] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!product) return <p className="text-destructive">Produto não encontrado.</p>;

  const margin = product.sale_price - product.cost_price;
  const marginPct = product.cost_price > 0 ? ((margin / product.cost_price) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{product.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEntry(true)}><PackagePlus className="h-4 w-4 mr-1" /> Entrada</Button>
          <Button variant="outline" onClick={() => navigate(`/inventory/products/${id}/edit`)}><Edit className="h-4 w-4 mr-1" /> Editar</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Estoque</p><p className="text-2xl font-bold">{product.quantity}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Custo</p><p className="text-2xl font-bold">R$ {product.cost_price.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Venda</p><p className="text-2xl font-bold">R$ {product.sale_price.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Margem</p><p className="text-2xl font-bold">{marginPct}%</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Categoria:</span> {product.category || "—"}</div>
          <div><span className="text-muted-foreground">Marca:</span> {product.brand || "—"}</div>
          <div><span className="text-muted-foreground">Fornecedor:</span> {product.suppliers?.name || "—"}</div>
          <div><span className="text-muted-foreground">Qtd. Mínima:</span> {product.minimum_quantity}</div>
          <div><span className="text-muted-foreground">Localização:</span> {product.location || "—"}</div>
          <div><span className="text-muted-foreground">Compatível:</span> {product.compatible_devices || "—"}</div>
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant={product.quantity <= product.minimum_quantity ? "destructive" : "default"}>
              {product.quantity <= product.minimum_quantity ? "Estoque Baixo" : "OK"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="movements">
        <TabsList><TabsTrigger value="movements">Movimentações</TabsTrigger></TabsList>
        <TabsContent value="movements">
          <StockMovementsTable productId={id} />
        </TabsContent>
      </Tabs>

      <StockEntryDialog open={showEntry} onOpenChange={setShowEntry} preselectedProductId={id} />
    </div>
  );
}
