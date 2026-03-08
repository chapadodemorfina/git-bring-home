import { useState } from "react";
import { Link } from "react-router-dom";
import { useServiceOrders } from "../hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors, ServiceOrderStatus } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TablePagination from "@/components/ui/table-pagination";
import { Plus, Search, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ServiceOrdersListPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useServiceOrders(search, filterStatus, page);

  const orders = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie todas as ordens de serviço</p>
        </div>
        <Button asChild>
          <Link to="/service-orders/new"><Plus className="mr-2 h-4 w-4" /> Nova OS</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por número, problema..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={filterStatus || "all"} onValueChange={(v) => { setFilterStatus(v === "all" ? null : v); setPage(1); }}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : !orders.length ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma ordem de serviço encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/service-orders/${o.id}`}>
                      <TableCell className="font-mono font-bold">{o.order_number}</TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{o.device_label || "—"}</TableCell>
                      <TableCell><Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge></TableCell>
                      <TableCell><Badge className={priorityColors[o.priority]}>{priorityLabels[o.priority]}</Badge></TableCell>
                      <TableCell>{format(new Date(o.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination page={page} pageSize={data?.pageSize || 50} total={total} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
