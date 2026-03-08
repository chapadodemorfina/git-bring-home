import { useState } from "react";
import { Search, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { statusLabels, statusColors } from "@/modules/service-orders/types";
import { useMyCollectionPoint, usePartnerOrders } from "../hooks/usePartnerPortal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PartnerOrdersPage() {
  const { data: cp, isLoading: cpLoading } = useMyCollectionPoint();
  const { data: orders, isLoading } = usePartnerOrders(cp?.id);
  const [search, setSearch] = useState("");

  if (cpLoading) return <Skeleton className="h-64" />;

  const filtered = orders?.filter((o: any) =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.device_label?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Ordens de Serviço</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar OS, cliente, dispositivo..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <Skeleton className="h-64" /> : !filtered?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma OS encontrada.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono font-bold text-sm">{o.order_number}</TableCell>
                <TableCell>{o.customer_name}</TableCell>
                <TableCell>{o.device_label || "—"}</TableCell>
                <TableCell>
                  <Badge className={statusColors[o.status as keyof typeof statusColors] || ""}>
                    {statusLabels[o.status as keyof typeof statusLabels] || o.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(o.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
