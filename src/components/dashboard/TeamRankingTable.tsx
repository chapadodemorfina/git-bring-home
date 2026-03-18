import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface TeamMember {
  user_id: string;
  name: string;
  sales_count: number;
  sales_revenue: number;
  so_count: number;
  total_revenue: number;
}

interface Props {
  data: TeamMember[];
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const medals = ["🥇", "🥈", "🥉"];

export function TeamRankingTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Ranking da Equipe</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Ranking da Equipe</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Vendas</TableHead>
              <TableHead className="text-center">Serviços</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((member, idx) => (
              <TableRow key={member.user_id}>
                <TableCell className="font-bold text-lg">{idx < 3 ? medals[idx] : idx + 1}</TableCell>
                <TableCell className="font-medium">{member.name || "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{member.sales_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{member.so_count}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">{fmt(Number(member.total_revenue))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
