import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Check, Banknote, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectionPoints } from "../hooks/useCollectionPoints";
import { commissionTypeLabels } from "../types";

const db = supabase as any;

function useAllCommissions(filters: { cpId?: string; status?: string }) {
  return useQuery({
    queryKey: ["all-commissions", filters],
    queryFn: async () => {
      let q = db
        .from("collection_point_commissions")
        .select("*, service_orders(order_number), collection_points(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.cpId) q = q.eq("collection_point_id", filters.cpId);
      if (filters.status === "paid") q = q.eq("is_paid", true);
      if (filters.status === "pending") q = q.eq("is_paid", false);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

function useMarkPaid() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("collection_point_commissions")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-commissions"] });
      toast({ title: "Comissão marcada como paga" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export default function CommissionManagementPage() {
  const [cpFilter, setCpFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: points } = useCollectionPoints();
  const { data: commissions, isLoading } = useAllCommissions({
    cpId: cpFilter !== "all" ? cpFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const markPaid = useMarkPaid();

  const totalPending = commissions?.filter((c: any) => !c.is_paid).reduce((s: number, c: any) => s + c.calculated_amount, 0) || 0;
  const totalPaid = commissions?.filter((c: any) => c.is_paid).reduce((s: number, c: any) => s + c.calculated_amount, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Gestão de Comissões
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-orange-600">R$ {totalPending.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Pagas</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold text-emerald-600">R$ {totalPaid.toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4"><p className="text-2xl font-bold">R$ {(totalPending + totalPaid).toFixed(2)}</p></CardContent>
        </Card>
      </div>

      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={cpFilter} onValueChange={setCpFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Ponto de Coleta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Parceiros</SelectItem>
            {points?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : !commissions?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma comissão encontrada.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.collection_points?.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.service_orders?.order_number}</TableCell>
                <TableCell>{commissionTypeLabels[c.commission_type as keyof typeof commissionTypeLabels]}</TableCell>
                <TableCell className="text-right">R$ {c.base_amount.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">R$ {c.calculated_amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={c.is_paid ? "default" : "secondary"}>
                    {c.is_paid ? "Pago" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {format(new Date(c.created_at), "dd/MM/yy", { locale: ptBR })}
                  {c.paid_at && <span className="block text-muted-foreground">Pago: {format(new Date(c.paid_at), "dd/MM/yy", { locale: ptBR })}</span>}
                </TableCell>
                <TableCell>
                  {!c.is_paid && (
                    <Button size="sm" variant="outline" onClick={() => markPaid.mutate(c.id)} disabled={markPaid.isPending}>
                      <Banknote className="h-4 w-4 mr-1" /> Pagar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
