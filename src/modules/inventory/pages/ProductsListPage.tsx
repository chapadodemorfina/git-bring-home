import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PackagePlus, Search, Archive, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts, useArchiveProduct } from "../hooks/useInventory";
import LowStockAlert from "../components/LowStockAlert";
import StockEntryDialog from "../components/StockEntryDialog";

export default function ProductsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showEntry, setShowEntry] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data: products, isLoading } = useProducts(search, showArchived);
  const archive = useArchiveProduct();

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

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, SKU ou marca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => navigate("/inventory/suppliers")}>Fornecedores</Button>
        <Button variant="outline" onClick={() => navigate("/inventory/movements")}>Movimentações</Button>
        <div className="flex items-center gap-2 ml-auto">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
            <Archive className="h-3.5 w-3.5 inline mr-1" />Mostrar arquivados
          </Label>
        </div>
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
              {showArchived && <TableHead>Status</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map(p => (
              <TableRow key={p.id} className={`cursor-pointer ${!p.is_active ? "opacity-60" : ""}`} onClick={() => navigate(`/inventory/products/${p.id}`)}>
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
                {showArchived && (
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Ativo" : "Arquivado"}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      archive.mutate({ id: p.id, archive: p.is_active });
                    }}
                    disabled={archive.isPending}
                    title={p.is_active ? "Arquivar" : "Reativar"}
                  >
                    {p.is_active ? <Archive className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!products?.length && (
              <TableRow><TableCell colSpan={showArchived ? 11 : 10} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <StockEntryDialog open={showEntry} onOpenChange={setShowEntry} />
    </div>
  );
}
