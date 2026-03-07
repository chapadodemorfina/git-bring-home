import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSuppliers, useCreateSupplier } from "../hooks/useInventory";
import SupplierForm from "../components/SupplierForm";

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useSuppliers();
  const create = useCreateSupplier();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Novo Fornecedor</Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers?.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contact_name || "—"}</TableCell>
                <TableCell>{s.email || "—"}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell>{s.document || "—"}</TableCell>
              </TableRow>
            ))}
            {!suppliers?.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum fornecedor cadastrado</TableCell></TableRow>
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
