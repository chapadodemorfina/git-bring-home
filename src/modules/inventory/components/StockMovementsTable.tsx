import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStockMovements } from "../hooks/useInventory";
import { movementTypeLabels, type StockMovementType } from "../types";

const movementColors: Record<StockMovementType, string> = {
  entry: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  exit: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  adjustment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  return: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  reserved: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  consumed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function StockMovementsTable({ productId }: { productId?: string }) {
  const { data: movements, isLoading } = useStockMovements(productId);

  if (isLoading) return <p className="text-muted-foreground text-sm py-4">Carregando movimentações...</p>;
  if (!movements?.length) return <p className="text-muted-foreground text-sm py-4">Nenhuma movimentação registrada.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          {!productId && <TableHead>Produto</TableHead>}
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Qtd</TableHead>
          <TableHead className="text-right">Anterior</TableHead>
          <TableHead className="text-right">Novo</TableHead>
          <TableHead>Observações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map(m => (
          <TableRow key={m.id}>
            <TableCell className="whitespace-nowrap">{format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
            {!productId && <TableCell>{m.products?.sku} — {m.products?.name}</TableCell>}
            <TableCell>
              <Badge variant="secondary" className={movementColors[m.movement_type]}>{movementTypeLabels[m.movement_type]}</Badge>
            </TableCell>
            <TableCell className="text-right font-mono">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
            <TableCell className="text-right font-mono">{m.previous_quantity}</TableCell>
            <TableCell className="text-right font-mono">{m.new_quantity}</TableCell>
            <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{m.notes}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
