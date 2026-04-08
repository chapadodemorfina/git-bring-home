import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCollectionPointUsers, useAddCollectionPointUser, useRemoveCollectionPointUser,
} from "../hooks/useCollectionPoints";
import { useUsersList } from "@/modules/users/hooks/useUsers";

export default function OperatorsPanel({ cpId }: { cpId: string }) {
  const { data: users, isLoading } = useCollectionPointUsers(cpId);
  const { data: allUsers, isLoading: usersLoading } = useUsersList();
  const addUser = useAddCollectionPointUser();
  const removeUser = useRemoveCollectionPointUser();
  const [selectedUserId, setSelectedUserId] = useState("");

  const linkedIds = new Set((users || []).map(u => u.user_id));
  const availableUsers = (allUsers || []).filter(u => u.is_active && !linkedIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    await addUser.mutateAsync({ collectionPointId: cpId, userId: selectedUserId });
    setSelectedUserId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={usersLoading ? "Carregando..." : "Selecione um usuário"} />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name} — {u.email}
              </SelectItem>
            ))}
            {availableUsers.length === 0 && !usersLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum usuário disponível</div>
            )}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={addUser.isPending || !selectedUserId}>
          <UserPlus className="h-4 w-4 mr-1" /> Vincular
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : !users?.length ? (
        <p className="text-muted-foreground text-sm">Nenhum operador vinculado.</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <span className="font-medium">{u.profiles?.full_name || "Usuário"}</span>
                <span className="text-sm text-muted-foreground ml-2">{u.profiles?.email}</span>
                {!u.is_active && <Badge variant="secondary" className="ml-2">Inativo</Badge>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeUser.mutate(u.id)}
                disabled={removeUser.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
