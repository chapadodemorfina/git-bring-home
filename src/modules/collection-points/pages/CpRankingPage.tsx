import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Trophy, Medal, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCpRanking } from "../hooks/useCpRanking";
import { useAllCollectionPoints } from "../hooks/useCollectionPoints";

const podiumEmojis = ["🥇", "🥈", "🥉"];
const podiumColors = [
  "from-yellow-500/20 to-yellow-600/5 border-yellow-500/40",
  "from-slate-300/20 to-slate-400/5 border-slate-400/40",
  "from-amber-700/20 to-amber-800/5 border-amber-700/40",
];

function fmt(v: number) {
  return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function CpRankingPage() {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
  const [cpFilter, setCpFilter] = useState("all");

  const { data: ranking, isLoading } = useCpRanking(
    periodStart || null,
    periodEnd || null,
    cpFilter !== "all" ? cpFilter : null,
  );
  const { data: points } = useAllCollectionPoints();

  const top3 = ranking?.slice(0, 3) || [];
  const rest = ranking?.slice(3) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" /> Ranking de Parceiros
        </h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">Parceiro</Label>
            <Select value={cpFilter} onValueChange={setCpFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {points?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? <Skeleton className="h-64" /> : !ranking?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum dado de ranking para o período selecionado.</CardContent></Card>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((entry, i) => (
              <Card key={entry.cp_id} className={`bg-gradient-to-b border-2 ${podiumColors[i]}`}>
                <CardHeader className="pb-2 pt-4 px-4 text-center">
                  <span className="text-4xl">{podiumEmojis[i]}</span>
                  <CardTitle className="text-lg mt-1">{entry.cp_name}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="text-xl font-bold">{fmt(entry.total_revenue)}</p>
                  </div>
                  <div className="flex justify-center gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">OS</p>
                      <p className="font-semibold">{entry.completed_orders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                      <p className="font-semibold">{fmt(entry.avg_ticket)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Comissão</p>
                    <p className="font-semibold text-primary">{fmt(entry.commission)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full table */}
          {ranking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="h-4 w-4" /> Classificação Completa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Parceiro</TableHead>
                      <TableHead className="text-right">OS Concluídas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((entry) => (
                      <TableRow key={entry.cp_id}>
                        <TableCell className="font-bold">
                          {entry.rank_position <= 3 ? podiumEmojis[entry.rank_position - 1] : entry.rank_position}
                        </TableCell>
                        <TableCell className="font-medium">{entry.cp_name}</TableCell>
                        <TableCell className="text-right">{entry.completed_orders}</TableCell>
                        <TableCell className="text-right">{fmt(entry.total_revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(entry.avg_ticket)}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{fmt(entry.commission)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
