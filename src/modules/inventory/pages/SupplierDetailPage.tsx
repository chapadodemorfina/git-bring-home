import { useParams, useNavigate } from "react-router-dom";
import { Edit, Archive, Eye, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSupplier, useArchiveSupplier, useDeleteSupplier } from "../hooks/useInventory";
import { supplierTypes } from "../types";

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id);
  const archiveMut = useArchiveSupplier();
  const deleteMut = useDeleteSupplier();

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!supplier) return <p className="text-destructive">Fornecedor não encontrado.</p>;

  const typeLabel = supplierTypes.find(t => t.value === supplier.supplier_type)?.label || supplier.supplier_type || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            {!supplier.is_active && <Badge variant="outline">Arquivado</Badge>}
          </div>
          {supplier.contact_name && <p className="text-muted-foreground text-sm">{supplier.contact_name}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => archiveMut.mutate({ id: id!, archive: supplier.is_active })}
            disabled={archiveMut.isPending}
          >
            {supplier.is_active ? <><Archive className="h-4 w-4 mr-1" /> Arquivar</> : <><Eye className="h-4 w-4 mr-1" /> Reativar</>}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" title="Excluir permanentemente">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir fornecedor permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O fornecedor só será excluído se não possuir vínculos com produtos, compras ou lançamentos financeiros.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMut.mutate(id!, { onSuccess: () => navigate("/inventory/suppliers") })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => navigate(`/inventory/suppliers/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">Email:</span> {supplier.email || "—"}</div>
          <div><span className="text-muted-foreground">Telefone:</span> {supplier.phone || "—"}</div>
          <div><span className="text-muted-foreground">WhatsApp:</span> {supplier.whatsapp || "—"}</div>
          <div><span className="text-muted-foreground">CNPJ/CPF:</span> {supplier.document || "—"}</div>
          <div><span className="text-muted-foreground">Tipo:</span> {typeLabel}</div>
          <div><span className="text-muted-foreground">Lead Time:</span> {supplier.lead_time_days != null ? `${supplier.lead_time_days} dias` : "—"}</div>
          <div><span className="text-muted-foreground">Endereço:</span> {supplier.address || "—"}</div>
          <div><span className="text-muted-foreground">Cidade:</span> {supplier.city || "—"}</div>
          <div><span className="text-muted-foreground">Estado:</span> {supplier.state || "—"}</div>
          <div><span className="text-muted-foreground">País:</span> {supplier.country || "—"}</div>
          <div className="col-span-2 md:col-span-3">
            <span className="text-muted-foreground">Observações:</span> {supplier.notes || "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
