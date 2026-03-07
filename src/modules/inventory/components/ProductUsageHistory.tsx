import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProductUsageHistory } from "../hooks/useInventory";

export default function ProductUsageHistory({ productId }: { productId: string }) {
  const { data: usage, isLoading } = useProductUsageHistory(productId);

  if (isLoading) return <p className="text-muted-foreground text-sm py-4">Carregando...</p>;
  if (!usage?.length) return <p className="text-muted-foreground text-sm py-4">Nenhum uso registrado.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>OS</TableHead>
          <TableHead className="text-right">Qtd</TableHead>
          <TableHead className="text-right">Custo Unit.</TableHead>
          <TableHead className="text-right">Preço Unit.</TableHead>
          <TableHead>Observações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usage.map(u => (
          <TableRow key={u.id}>
            <TableCell className="whitespace-nowrap">{format(new Date(u.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
            <TableCell className="font-mono text-xs">{u.service_order_id.slice(0, 8)}...</TableCell>
            <TableCell className="text-right">{u.quantity}</TableCell>
            <TableCell className="text-right">R$ {u.unit_cost.toFixed(2)}</TableCell>
            <TableCell className="text-right">R$ {u.unit_price.toFixed(2)}</TableCell>
            <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{u.notes || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
