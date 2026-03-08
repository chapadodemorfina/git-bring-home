import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomers, useDeleteCustomer } from "../hooks/useCustomers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import TablePagination from "@/components/ui/table-pagination";
import { Search, Plus, Eye, Pencil, Trash2, Loader2, Building2, User } from "lucide-react";

export default function CustomersListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const filterActive = statusFilter === "all" ? null : statusFilter === "active";
  const { data, isLoading } = useCustomers(search, filterActive, page);
  const customers = data?.items || [];
  const total = data?.total || 0;
  const deleteCustomer = useDeleteCustomer();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerenciamento de clientes</p>
        </div>
        <Button onClick={() => navigate("/customers/new")}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Clientes</CardTitle>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, telefone, CPF/CNPJ..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!customers.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell>
                    </TableRow>
                  ) : (
                    customers.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                        <TableCell>
                          {c.type === "business" ? (
                            <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> PJ</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><User className="h-3 w-3" /> PF</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="font-mono text-sm">{c.document || "—"}</TableCell>
                        <TableCell>{c.phone || "—"}</TableCell>
                        <TableCell>{c.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/customers/${c.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita. O cliente "{c.full_name}" será removido permanentemente.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCustomer.mutate(c.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination page={page} pageSize={data?.pageSize || 50} total={total} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
