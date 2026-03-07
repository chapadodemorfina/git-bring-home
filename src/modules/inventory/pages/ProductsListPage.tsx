import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PackagePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts } from "../hooks/useInventory";
import LowStockAlert from "../components/LowStockAlert";
import StockEntryDialog from "../components/StockEntryDialog";

export default function ProductsListPage() {
  const navigate = useNavigate();
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [showEntry, setShowEntry] = useState(false);

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estoque & Peças</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEntry(true)}>
            <PackagePlus className="h-4 w-4 mr-1" /> Entrada
          </Button>
          <Button onClick={() => navigate("/inventory/products/new")}>
            <Plus className="h-4 w-4 mr-1" /> Novo Produto
          </Button>
        </div>
      </div>

      <LowStockAlert />

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, SKU ou marca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => navigate("/inventory/suppliers")}>Fornecedores</Button>
        <Button variant="outline" onClick={() => navigate("/inventory/movements")}>Movimentações</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Venda</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Reserv.</TableHead>
                <TableHead className="text-right">Dispon.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map(p => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/inventory/products/${p.id}`)}>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.category || "—"}</TableCell>
                <TableCell>{p.suppliers?.name || "—"}</TableCell>
                <TableCell className="text-right">R$ {p.cost_price.toFixed(2)}</TableCell>
                <TableCell className="text-right">R$ {p.sale_price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={p.quantity <= p.minimum_quantity ? "destructive" : "secondary"}>{p.quantity}</Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{(p as any).reserved_quantity || 0}</TableCell>
                <TableCell className="text-right font-medium">{p.quantity - ((p as any).reserved_quantity || 0)}</TableCell>
              </TableRow>
            ))}
            {!filtered?.length && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <StockEntryDialog open={showEntry} onOpenChange={setShowEntry} />
    </div>
  );
}
