import { useState } from "react";
import { Link } from "react-router-dom";
import { useFinancialEntries } from "../hooks/useFinance";
import {
  entryTypeLabels, entryTypeColors, statusLabels, statusColors,
  FinancialEntryType, FinancialEntryStatus,
} from "../types";
import FinanceDashboard from "../components/FinanceDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FinanceListPage() {
  const [tab, setTab] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const entryType = tab === "all" ? null : (tab as FinancialEntryType);
  const { data: entries, isLoading } = useFinancialEntries(entryType, filterStatus as FinancialEntryStatus | null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Financeiro
          </h1>
          <p className="text-muted-foreground">Receitas, despesas e comissões</p>
        </div>
        <Button asChild>
          <Link to="/finance/new"><Plus className="mr-2 h-4 w-4" /> Novo Lançamento</Link>
        </Button>
      </div>

      <FinanceDashboard />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="revenue">Receitas</TabsTrigger>
                <TabsTrigger value="expense">Despesas</TabsTrigger>
                <TabsTrigger value="commission">Comissões</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.entries(statusLabels) as [FinancialEntryStatus, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !entries?.length ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/finance/${entry.id}`}
                  >
                    <TableCell className="font-medium max-w-[250px] truncate">{entry.description}</TableCell>
                    <TableCell><Badge className={entryTypeColors[entry.entry_type]}>{entryTypeLabels[entry.entry_type]}</Badge></TableCell>
                    <TableCell><Badge className={statusColors[entry.status]}>{statusLabels[entry.status]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.order_number || entry.customer_name || entry.supplier_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.due_date ? format(new Date(entry.due_date), "dd/MM/yy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      R$ {Number(entry.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      R$ {Number(entry.paid_amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
