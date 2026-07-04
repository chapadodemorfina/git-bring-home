import { useState } from "react";
import { Link } from "react-router-dom";
import { useServiceOrders } from "../hooks/useServiceOrders";
import { statusLabels, statusColors, priorityLabels, priorityColors } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DataPagination from "@/components/ui/data-pagination";
import { SearchInput } from "@/components/ui/search-input";
import ServiceOrderFilters, { defaultFilters, type ServiceOrderFilterValues } from "../components/ServiceOrderFilters";
import { Plus, ClipboardList, MapPin, Store, CircleDollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Can } from "@/modules/permissions/components/Can";

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  partial: { label: "Parcial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  pending: { label: "Pendente", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ServiceOrdersListPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ServiceOrderFilterValues>({ ...defaultFilters });
  const [page, setPage] = useState(1);
  const { data, isLoading } = useServiceOrders(search, filters, page);

  const orders = data?.items || [];
  const total = data?.total || 0;

  const handleFilterChange = (f: ServiceOrderFilterValues) => {
    setFilters(f);
    setPage(1);
  };

  // Active filter chips for visibility
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filters.status) activeChips.push({ label: `Status: ${statusLabels[filters.status as keyof typeof statusLabels]}`, onRemove: () => handleFilterChange({ ...filters, status: null }) });
  if (filters.priority) activeChips.push({ label: `Prioridade: ${priorityLabels[filters.priority as keyof typeof priorityLabels]}`, onRemove: () => handleFilterChange({ ...filters, priority: null }) });
  if (filters.origin) activeChips.push({ label: `Origem: ${filters.origin === "counter" ? "Balcão" : "Parceiro"}`, onRemove: () => handleFilterChange({ ...filters, origin: null, collectionPointId: null }) });
  if (filters.dateFrom) activeChips.push({ label: `De: ${format(filters.dateFrom, "dd/MM/yy")}`, onRemove: () => handleFilterChange({ ...filters, dateFrom: undefined }) });
  if (filters.dateTo) activeChips.push({ label: `Até: ${format(filters.dateTo, "dd/MM/yy")}`, onRemove: () => handleFilterChange({ ...filters, dateTo: undefined }) });

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
            <SearchInput
              value={search}
              onSearch={(v) => { setSearch(v); setPage(1); }}
              placeholder="Buscar por número, cliente, dispositivo, ponto de coleta..."
              className="flex-1"
            />
            <ServiceOrderFilters filters={filters} onChange={handleFilterChange} />
          </div>
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeChips.map((chip) => (
                <Badge key={chip.label} variant="secondary" className="gap-1 text-xs cursor-pointer hover:bg-destructive/10" onClick={chip.onRemove}>
                  {chip.label} ✕
                </Badge>
              ))}
            </div>
          )}
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
                      <TableHead className="hidden lg:table-cell">Financeiro</TableHead>
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
                        <TableCell className="hidden lg:table-cell">
                          {o.payment_status ? (
                            <Badge className={paymentStatusConfig[o.payment_status]?.className || "bg-muted text-muted-foreground"}>
                              {paymentStatusConfig[o.payment_status]?.label || o.payment_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                        {o.payment_status && (
                          <Badge className={`text-[10px] ${paymentStatusConfig[o.payment_status]?.className || ""}`}>
                            {paymentStatusConfig[o.payment_status]?.label || o.payment_status}
                          </Badge>
                        )}
                      </div>
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
