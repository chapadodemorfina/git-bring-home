import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Archive, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSuppliers, useCreateSupplier, useArchiveSupplier } from "../hooks/useInventory";
import SupplierForm from "../components/SupplierForm";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const { data: suppliers, isLoading } = useSuppliers(search, showArchived);
  const create = useCreateSupplier();
  const archiveMut = useArchiveSupplier();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Novo Fornecedor</Button>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, contato, email, telefone, CNPJ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Switch id="show-archived-suppliers" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived-suppliers" className="text-sm text-muted-foreground cursor-pointer">
            <Archive className="h-3.5 w-3.5 inline mr-1" />Mostrar arquivados
          </Label>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              {showArchived && <TableHead>Status</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers?.map(s => (
              <TableRow key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact_name || "—"}</TableCell>
                <TableCell>{s.email || "—"}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell>{s.document || "—"}</TableCell>
                {showArchived && (
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "outline"}>{s.is_active ? "Ativo" : "Arquivado"}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => archiveMut.mutate({ id: s.id, archive: s.is_active })}
                    disabled={archiveMut.isPending}
                    title={s.is_active ? "Arquivar" : "Reativar"}
                  >
                    {s.is_active ? <Archive className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!suppliers?.length && (
              <TableRow><TableCell colSpan={showArchived ? 7 : 6} className="text-center text-muted-foreground py-8">Nenhum fornecedor cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
          <SupplierForm
            isLoading={create.isPending}
            onSubmit={async (data) => {
              await create.mutateAsync(data);
              setShowForm(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
