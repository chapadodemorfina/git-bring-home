import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCollectionPoints } from "../hooks/useCollectionPoints";
import { commissionTypeLabels } from "../types";

export default function CollectionPointsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: points, isLoading } = useCollectionPoints(search);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" /> Pontos de Coleta</h1>
        <Button onClick={() => navigate("/collection-points/new")}>
          <Plus className="h-4 w-4 mr-1" /> Novo Ponto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, responsável, cidade, telefone, email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : (
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
            {points?.map(p => (
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
            {!points?.length && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum ponto de coleta encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
