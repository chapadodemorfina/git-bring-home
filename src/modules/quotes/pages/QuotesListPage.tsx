import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuotesList, useQuotesSummary, useChangeQuoteStatus, useDuplicateQuote } from "../hooks/useQuotes";
import { quoteStatusLabels, quoteStatusColors, CommercialQuoteStatus } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DataPagination from "@/components/ui/data-pagination";
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Copy, MoreHorizontal, TrendingUp, Clock, DollarSign, BarChart3 } from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function QuotesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: summary } = useQuotesSummary();
  const { data: result, isLoading } = useQuotesList({ page, search, status: statusFilter });
  const changeStatus = useChangeQuoteStatus();
  const duplicate = useDuplicateQuote();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v === "all" ? "" : v); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gestão comercial de propostas</p>
        </div>
        <Button onClick={() => navigate("/quotes/new")}>
          <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileText className="h-3.5 w-3.5" /> Total</div>
            <p className="text-xl font-bold">{summary.total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-blue-600 text-xs mb-1"><Send className="h-3.5 w-3.5" /> Enviados</div>
            <p className="text-xl font-bold">{summary.sent}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-green-600 text-xs mb-1"><CheckCircle className="h-3.5 w-3.5" /> Aprovados</div>
            <p className="text-xl font-bold">{summary.approved}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-red-600 text-xs mb-1"><XCircle className="h-3.5 w-3.5" /> Recusados</div>
            <p className="text-xl font-bold">{summary.rejected}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="h-3.5 w-3.5" /> Taxa Aprovação</div>
            <p className="text-xl font-bold">{summary.approval_rate}%</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" /> Valor Aprovado</div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_approved_value)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número ou título..." value={search}
            onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(quoteStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-muted-foreground">Carregando...</p>
          ) : !result?.items?.length ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum orçamento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((q) => {
                  const isExpired = q.status === "expired" || (q.valid_until && new Date(q.valid_until) < new Date() && q.status === "sent");
                  return (
                    <TableRow key={q.id}
                      className={`cursor-pointer ${isExpired ? "opacity-60" : ""}`}
                      onClick={() => navigate(`/quotes/${q.id}`)}>
                      <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                      <TableCell>{q.customers?.full_name || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{q.title || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(q.total_amount))}</TableCell>
                      <TableCell className="text-sm">
                        {q.valid_until ? (
                          <span className={isExpired ? "text-destructive" : ""}>
                            {format(new Date(q.valid_until), "dd/MM/yyyy")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={quoteStatusColors[q.status as CommercialQuoteStatus]}>
                          {quoteStatusLabels[q.status as CommercialQuoteStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(q.created_at), "dd/MM/yy")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/quotes/${q.id}`)}>
                              Ver Detalhes
                            </DropdownMenuItem>
                            {q.status === "draft" && (
                              <DropdownMenuItem onClick={() => navigate(`/quotes/${q.id}/edit`)}>
                                Editar
                              </DropdownMenuItem>
                            )}
                            {q.status === "draft" && (
                              <DropdownMenuItem onClick={() => changeStatus.mutate({ id: q.id, status: "sent" })}>
                                Enviar ao Cliente
                              </DropdownMenuItem>
                            )}
                            {(q.status === "draft" || q.status === "sent") && (
                              <DropdownMenuItem onClick={() => changeStatus.mutate({ id: q.id, status: "approved" })}>
                                Aprovar
                              </DropdownMenuItem>
                            )}
                            {(q.status === "draft" || q.status === "sent") && (
                              <DropdownMenuItem onClick={() => changeStatus.mutate({ id: q.id, status: "rejected", reason: "Recusado manualmente" })}>
                                Recusar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => duplicate.mutate(q.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            {q.status !== "cancelled" && q.status !== "approved" && (
                              <DropdownMenuItem className="text-destructive" onClick={() => changeStatus.mutate({ id: q.id, status: "cancelled" })}>
                                Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {result && (
        <DataPagination page={result.page} pageSize={result.pageSize}
          total={result.total} onPageChange={setPage} />
      )}
    </div>
  );
}
