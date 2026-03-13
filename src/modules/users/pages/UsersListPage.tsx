/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsersList, useDeactivateUser, useActivateUser, useResetPasswordLink, useResetPasswordManual } from "../hooks/useUsers";
import { roleLabels, roleBadgeVariants, AppRole } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, Search, Plus, MoreHorizontal, Pencil, UserX, UserCheck, KeyRound, Copy, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function UsersListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: users, isLoading } = useUsersList();
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const resetLinkMutation = useResetPasswordLink();
  const resetManualMutation = useResetPasswordManual();

  const [search, setSearch] = useState("");
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; email: string; name: string }>({
    open: false, userId: "", email: "", name: "",
  });
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; userId: string; name: string }>({
    open: false, action: "", userId: "", name: "",
  });

  const filtered = (users || []).filter((u) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower) ||
      u.roles?.some((r) => roleLabels[r]?.toLowerCase().includes(lower))
    );
  });

  const handleConfirmAction = () => {
    if (confirmDialog.action === "deactivate") {
      deactivateMutation.mutate(confirmDialog.userId);
    } else if (confirmDialog.action === "activate") {
      activateMutation.mutate(confirmDialog.userId);
    }
    setConfirmDialog({ open: false, action: "", userId: "", name: "" });
  };

  const handleResetManual = () => {
    if (newPassword.length < 6) return;
    resetManualMutation.mutate({ user_id: resetDialog.userId, new_password: newPassword });
    setNewPassword("");
    setResetDialog({ open: false, userId: "", email: "", name: "" });
    setRecoveryLink(null);
  };

  const handleGenerateLink = async () => {
    const data = await resetLinkMutation.mutateAsync(resetDialog.email);
    if (data.recovery_link) {
      setRecoveryLink(data.recovery_link);
    }
  };

  const handleCopyLink = () => {
    if (recoveryLink) {
      navigator.clipboard.writeText(recoveryLink);
      toast({ title: "Link copiado para a área de transferência" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Equipe</h1>
          <p className="text-muted-foreground">Gerencie os membros da equipe e suas permissões</p>
        </div>
        <Button onClick={() => navigate("/system/users/new")}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <div className="relative max-w-sm pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhum resultado encontrado" : "Nenhum usuário cadastrado"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Funções</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">Sem função</Badge>
                          ) : (
                            u.roles.map((r) => (
                              <Badge key={r} variant={roleBadgeVariants[r] || "outline"}>
                                {roleLabels[r] || r}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "default" : "secondary"}>
                          {u.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/system/users/${u.id}/edit`)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setRecoveryLink(null);
                              setNewPassword("");
                              setResetDialog({ open: true, userId: u.id, email: u.email, name: u.full_name });
                            }}>
                              <KeyRound className="mr-2 h-4 w-4" /> Redefinir Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.is_active ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setConfirmDialog({ open: true, action: "deactivate", userId: u.id, name: u.full_name })}
                              >
                                <UserX className="mr-2 h-4 w-4" /> Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, action: "activate", userId: u.id, name: u.full_name })}>
                                <UserCheck className="mr-2 h-4 w-4" /> Reativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Deactivate/Activate Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: "", userId: "", name: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "deactivate" ? "Desativar Usuário" : "Reativar Usuário"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "deactivate"
                ? `Tem certeza que deseja desativar "${confirmDialog.name}"? O usuário não poderá mais acessar o sistema.`
                : `Deseja reativar o acesso de "${confirmDialog.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, action: "", userId: "", name: "" })}>
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.action === "deactivate" ? "destructive" : "default"}
              onClick={handleConfirmAction}
            >
              {confirmDialog.action === "deactivate" ? "Desativar" : "Reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog.open} onOpenChange={(open) => {
        if (!open) {
          setResetDialog({ open: false, userId: "", email: "", name: "" });
          setRecoveryLink(null);
          setNewPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              Escolha como redefinir a senha de "{resetDialog.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Generate recovery link */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleGenerateLink}
                disabled={resetLinkMutation.isPending}
              >
                {resetLinkMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Gerar link de recuperação
              </Button>

              {recoveryLink && (
                <div className="rounded-lg border bg-muted p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Link de recuperação gerado:</p>
                  <div className="flex gap-2">
                    <Input
                      value={recoveryLink}
                      readOnly
                      className="text-xs font-mono bg-background"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Copie e envie este link manualmente ao usuário. Ele NÃO é enviado por email automaticamente.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <Label>Definir nova senha manualmente</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="password"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  onClick={handleResetManual}
                  disabled={newPassword.length < 6 || resetManualMutation.isPending}
                >
                  {resetManualMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Definir
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
