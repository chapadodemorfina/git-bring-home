import { useState } from "react";
import { Link } from "react-router-dom";
import { useServiceOrders } from "../hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors, ServiceOrderStatus } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataPagination from "@/components/ui/data-pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, ClipboardList, MapPin, Store } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
              <SearchInput
                value={search}
                onSearch={(v) => { setSearch(v); setPage(1); }}
                placeholder="Buscar por número, cliente, dispositivo, problema..."
              />
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
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden lg:table-cell">Dispositivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Prioridade</TableHead>
                      <TableHead className="hidden lg:table-cell">Responsável</TableHead>
                      <TableHead className="hidden lg:table-cell">Origem</TableHead>
                      <TableHead className="text-right">Valor OS</TableHead>
                      <TableHead className="hidden xl:table-cell">Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/service-orders/${o.id}`}>
                        <TableCell className="font-mono font-bold">{o.order_number}</TableCell>
                        <TableCell>{o.customer_name}</TableCell>
                        <TableCell className="hidden lg:table-cell">{o.device_label || "—"}</TableCell>
                        <TableCell><Badge className={statusColors[o.status]}>{statusLabels[o.status]}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell"><Badge className={priorityColors[o.priority]}>{priorityLabels[o.priority]}</Badge></TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{o.technician_name || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {o.collection_point_name ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {o.collection_point_name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <Store className="h-3.5 w-3.5" />
                              Balcão
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {o.total_amount > 0 ? formatBRL(o.total_amount) : (
                            <span className="text-muted-foreground font-normal">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">{format(new Date(o.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {orders.map((o) => (
                  <Link key={o.id} to={`/service-orders/${o.id}`} className="block border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sm">{o.order_number}</span>
                      <Badge className={`text-[10px] ${statusColors[o.status]}`}>{statusLabels[o.status]}</Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{o.customer_name}</p>
                    {o.device_label && <p className="text-xs text-muted-foreground truncate">{o.device_label}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                      <span className="font-mono text-sm font-semibold text-primary">
                        {o.total_amount > 0 ? formatBRL(o.total_amount) : "—"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
