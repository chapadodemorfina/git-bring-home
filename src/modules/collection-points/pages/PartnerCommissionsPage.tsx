import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyCollectionPoint, usePartnerCommissions } from "../hooks/usePartnerPortal";
import { commissionTypeLabels } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PartnerCommissionsPage() {
  const { data: cp, isLoading: cpLoading } = useMyCollectionPoint();
  const { data: commissions, isLoading } = usePartnerCommissions(cp?.id);

  if (cpLoading) return <Skeleton className="h-64" />;

  const totalPending = commissions?.filter((c: any) => !c.is_paid).reduce((s: number, c: any) => s + c.calculated_amount, 0) || 0;
  const totalPaid = commissions?.filter((c: any) => c.is_paid).reduce((s: number, c: any) => s + c.calculated_amount, 0) || 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" /> Minhas Comissões</h1>

      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">Pendente: <span className="font-semibold text-foreground">R$ {totalPending.toFixed(2)}</span></span>
        <span className="text-muted-foreground">Pago: <span className="font-semibold text-foreground">R$ {totalPaid.toFixed(2)}</span></span>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : !commissions?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma comissão registrada.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.service_orders?.order_number}</TableCell>
                <TableCell>{commissionTypeLabels[c.commission_type as keyof typeof commissionTypeLabels]}</TableCell>
                <TableCell className="text-right">R$ {c.base_amount.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">R$ {c.calculated_amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={c.is_paid ? "default" : "secondary"}>
                    {c.is_paid ? "Pago" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
