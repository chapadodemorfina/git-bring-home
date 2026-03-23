import { useState } from "react";
import { useWarrantyReturnsList, useResolveReturn } from "../hooks/useWarrantyAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import DataPagination from "@/components/ui/data-pagination";
import { ArrowLeft, Search, ExternalLink, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { returnStatusLabels, returnOutcomeLabels } from "../types";

export default function WarrantyReturnsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: returnsData, isLoading } = useWarrantyReturnsList(search, page, statusFilter);
  const returns = returnsData?.items || [];
  const total = returnsData?.total || 0;
  
  const resolveReturn = useResolveReturn();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string>("");
  const [analysis, setAnalysis] = useState("");

  const handleResolve = async () => {
    if (!selectedReturnId || !outcome) return;
    await resolveReturn.mutateAsync({ returnId: selectedReturnId, outcome, technicalAnalysis: analysis.trim() || undefined });
    setResolveOpen(false);
    setSelectedReturnId(null);
    setOutcome("");
    setAnalysis("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link to="/warranties"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Retornos de Garantia</h1>
          <p className="text-muted-foreground">Gerenciar retornos e análise técnica</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onSearch={(v) => { setSearch(v); setPage(1); }}
              placeholder="Buscar por motivo, garantia, cliente, OS..."
              containerClassName="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_analysis">Em Análise</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Garantia</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Causa</TableHead>
                    <TableHead>Cobertura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nova OS</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum retorno encontrado</TableCell></TableRow>
                  ) : (
                    returns.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link to={`/warranties/${r.warranty_id}`} className="font-mono text-sm text-primary hover:underline">
                            {r.warranty_number || r.warranties?.warranty_number || "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{r.customer_name || r.warranties?.service_orders?.customers?.full_name || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.reason}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.return_cause || "—"}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{returnOutcomeLabels[r.outcome] || r.outcome || "pendente"}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={r.status === "open" ? "default" : r.status === "in_analysis" ? "outline" : "secondary"}>
                            {returnStatusLabels[r.status] || r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.new_service_order_id ? (
                            <Link to={`/service-orders/${r.new_service_order_id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                              Ver OS <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(r.created_at), "dd/MM/yy", { locale: ptBR })}</TableCell>
                        <TableCell>
                          {r.status !== "resolved" && r.status !== "cancelled" && (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedReturnId(r.id); setResolveOpen(true); }}>
                              <CheckCircle className="mr-1 h-4 w-4" />Resolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="px-4">
                <DataPagination page={page} pageSize={returnsData?.pageSize || 25} total={total} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver Retorno de Garantia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cobertura</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue placeholder="O retorno é coberto pela garantia?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="covered">Coberto pela garantia</SelectItem>
                  <SelectItem value="not_covered">Não coberto</SelectItem>
                  <SelectItem value="partial">Parcialmente coberto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Análise Técnica</Label>
              <Textarea value={analysis} onChange={e => setAnalysis(e.target.value)} rows={4} placeholder="Descreva a análise técnica e conclusão..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancelar</Button>
            <Button onClick={handleResolve} disabled={!outcome || resolveReturn.isPending}>Resolver Retorno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
