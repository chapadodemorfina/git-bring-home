import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DataPagination from "@/components/ui/data-pagination";
import { Recycle, Plus, Search, Eye, BarChart3, Loader2 } from "lucide-react";
import { useScrapItemsPaginated, useScrapRecoveryValue } from "../hooks/useScrapDisassembly";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  aguardando_triagem: "Aguardando Triagem",
  triada: "Triada",
  desmontada: "Desmontada",
  pecas_recuperadas: "Peças Recuperadas",
  descartada: "Descartada",
  vendida: "Vendida",
  usada_internamente: "Usada Internamente",
};

const statusColors: Record<string, string> = {
  aguardando_triagem: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  triada: "bg-blue-500/10 text-blue-700 border-blue-300",
  desmontada: "bg-purple-500/10 text-purple-700 border-purple-300",
  pecas_recuperadas: "bg-green-500/10 text-green-700 border-green-300",
  descartada: "bg-red-500/10 text-red-700 border-red-300",
  vendida: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  usada_internamente: "bg-cyan-500/10 text-cyan-700 border-cyan-300",
};

const categoryLabels: Record<string, string> = {
  aparelho_completo: "Aparelho Completo",
  placa: "Placa",
  carcaca: "Carcaça",
  tela_quebrada: "Tela Quebrada",
  lote_pecas: "Lote de Peças",
  acessorio: "Acessório",
};

export default function ScrapListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useScrapItemsPaginated(
    search,
    statusFilter !== "all" ? statusFilter : undefined,
    categoryFilter !== "all" ? categoryFilter : undefined,
    page,
  );
  const { data: recoveryValue = 0 } = useScrapRecoveryValue();

  const scraps = data?.items || [];
  const total = data?.total || 0;
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Recycle className="h-6 w-6" /> Sucata & Reaproveitamento
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/inventory/scrap/dashboard")}>
            <BarChart3 className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <Button onClick={() => navigate("/inventory/scrap/new")}>
            <Plus className="h-4 w-4 mr-1" /> Nova Sucata
          </Button>
        </div>
      </div>

      <Card className="px-4 py-2 inline-block">
        <span className="text-sm text-muted-foreground">Valor Recuperado: </span>
        <span className="font-bold text-primary">{fmt.format(recoveryValue)}</span>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <SearchInput
          placeholder="Buscar por descrição, marca, modelo..."
          value={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          className="max-w-xs flex-1"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : scraps.length === 0 ? (
            <p className="p-6 text-muted-foreground text-sm">Nenhuma sucata encontrada.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor Est.</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scraps.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/inventory/scrap/${s.id}`)}>
                      <TableCell className="font-medium">{s.device_type}</TableCell>
                      <TableCell>{[s.brand, s.model].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabels[s.scrap_category || ""] || s.scrap_category || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[s.status || ""] || ""} variant="outline">
                          {statusLabels[s.status || ""] || s.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.service_orders?.order_number || s.customers?.full_name || "—"}
                      </TableCell>
                      <TableCell>{fmt.format(s.estimated_recovery_value || 0)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.created_at), "dd/MM/yy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/inventory/scrap/${s.id}`); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4">
                <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
