import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X } from "lucide-react";
import { format } from "date-fns";
import { useScrapDisassemblies, useAllRecoveredPartsForScrap } from "../hooks/useScrapDisassembly";

interface Props {
  scrapId: string;
  onClose?: () => void;
  hideClose?: boolean;
}

export function ScrapHistoryPanel({ scrapId, onClose }: Props) {
  const { data: disassemblies = [] } = useScrapDisassemblies(scrapId);
  const { data: allParts = [] } = useAllRecoveredPartsForScrap(scrapId);

  const totalValue = allParts
    .filter((p) => p.added_to_stock)
    .reduce((sum, p) => sum + (p.products?.cost_price || 0) * p.quantity, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Histórico de Desmontagem</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {disassemblies.length} desmontagens • Valor recuperado:{" "}
          <span className="font-semibold text-foreground">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
          </span>
        </div>

        {disassemblies.map((d) => {
          const dParts = allParts.filter((p) => p.disassembly_id === d.id);
          return (
            <div key={d.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}
                </span>
                <span className="text-muted-foreground">
                  Técnico: {d.profiles?.full_name || "—"}
                </span>
              </div>
              {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
              {dParts.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dParts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.products?.name || "—"}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell><Badge variant="outline">{p.condition}</Badge></TableCell>
                        <TableCell>
                          {p.added_to_stock ? (
                            <Badge className="bg-green-600 text-white">No estoque</Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          );
        })}

        {disassemblies.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma desmontagem registrada.</p>
        )}
      </CardContent>
    </Card>
  );
}
