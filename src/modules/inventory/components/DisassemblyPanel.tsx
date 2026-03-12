import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Plus, PackageCheck, Wrench } from "lucide-react";
import { useProducts } from "../hooks/useInventory";
import {
  useScrapDisassemblies,
  useRecoveredParts,
  useAddRecoveredPart,
  useRecoverPartToStock,
  useCreateDisassembly,
} from "../hooks/useScrapDisassembly";

const conditions = [
  { value: "novo", label: "Novo" },
  { value: "bom", label: "Bom" },
  { value: "usado", label: "Usado" },
  { value: "para_teste", label: "Para Teste" },
];

interface Props {
  scrapId: string;
  onClose: () => void;
}

export function DisassemblyPanel({ scrapId, onClose }: Props) {
  const { data: disassemblies = [] } = useScrapDisassemblies(scrapId);
  const latestDisassembly = disassemblies[0];
  const { data: parts = [] } = useRecoveredParts(latestDisassembly?.id);
  const { data: products = [] } = useProducts();
  const addPart = useAddRecoveredPart();
  const recoverToStock = useRecoverPartToStock();
  const createDisassembly = useCreateDisassembly();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("usado");
  const [newNotes, setNewNotes] = useState("");

  const handleStartNew = async () => {
    await createDisassembly.mutateAsync({ scrapId, notes: newNotes || undefined });
    setNewNotes("");
  };

  const handleAdd = async () => {
    if (!productId || !latestDisassembly) return;
    await addPart.mutateAsync({
      disassembly_id: latestDisassembly.id,
      product_id: productId,
      quantity,
      condition,
    });
    setProductId("");
    setQuantity(1);
    setCondition("usado");
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wrench className="h-5 w-5" /> Desmontagem
        </CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Start new disassembly */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Nova Desmontagem — Observações</Label>
            <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Observações (opcional)..." rows={2} />
          </div>
          <Button onClick={handleStartNew} disabled={createDisassembly.isPending}>
            <Wrench className="h-4 w-4 mr-1" /> Iniciar
          </Button>
        </div>

        {latestDisassembly && (
          <>
            {latestDisassembly.notes && (
              <p className="text-sm text-muted-foreground">Obs: {latestDisassembly.notes}</p>
            )}

            {/* Add part form */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-1">
                <Label>Produto</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qtd</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              </div>
              <div>
                <Label>Condição</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {conditions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={addPart.isPending || !productId}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            {/* Parts list */}
            {parts.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>{part.products?.name || "—"} <span className="text-xs text-muted-foreground">({part.products?.sku})</span></TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{conditions.find((c) => c.value === part.condition)?.label || part.condition}</Badge>
                      </TableCell>
                      <TableCell>
                        {part.added_to_stock ? (
                          <Badge className="bg-green-600 text-white">Adicionado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!part.added_to_stock && (
                          <Button
                            size="sm"
                            onClick={() => recoverToStock.mutate(part.id)}
                            disabled={recoverToStock.isPending}
                          >
                            <PackageCheck className="h-3.5 w-3.5 mr-1" /> Enviar ao Estoque
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {!latestDisassembly && (
          <p className="text-sm text-muted-foreground">Nenhuma desmontagem ainda. Clique em "Iniciar" para começar.</p>
        )}
      </CardContent>
    </Card>
  );
}
