import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DataPagination from "@/components/ui/data-pagination";
import { useCollectionPoints } from "../hooks/useCollectionPoints";
import { commissionTypeLabels } from "../types";

export default function CollectionPointsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCollectionPoints(search, page);
  const points = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" /> Pontos de Coleta</h1>
        <Button onClick={() => navigate("/collection-points/new")}>
          <Plus className="h-4 w-4 mr-1" /> Novo Ponto
        </Button>
      </div>

      <SearchInput
        placeholder="Buscar por nome, responsável, cidade, telefone, email..."
        value={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/collection-points/${p.id}`)}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.responsible_person || "—"}</TableCell>
                  <TableCell>{[p.city, p.state].filter(Boolean).join("/") || "—"}</TableCell>
                  <TableCell>{p.phone || p.whatsapp || "—"}</TableCell>
                  <TableCell>
                    {commissionTypeLabels[p.commission_type]}: {p.commission_type === "percentage" ? `${p.commission_value}%` : `R$ ${p.commission_value.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!points.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum ponto de coleta encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DataPagination page={page} pageSize={data?.pageSize || 25} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
