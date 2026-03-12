import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, PackagePlus, Search, Recycle, History } from "lucide-react";
import { useScrapItems, useCreateDisassembly, useScrapRecoveryValue } from "../hooks/useScrapDisassembly";
import { DisassemblyPanel } from "../components/DisassemblyPanel";
import { ScrapHistoryPanel } from "../components/ScrapHistoryPanel";

export default function ScrapDisassemblyPage() {
  const [search, setSearch] = useState("");
  const [selectedScrapId, setSelectedScrapId] = useState<string | null>(null);
  const [historyScrapId, setHistoryScrapId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newScrapId, setNewScrapId] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");

  const { data: scraps = [], isLoading } = useScrapItems();
  const { data: recoveryValue = 0 } = useScrapRecoveryValue();
  const createDisassembly = useCreateDisassembly();

  const filtered = scraps.filter((s) => {
    const q = search.toLowerCase();
    return !q || [s.device_type, s.brand, s.model, s.notes].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const handleStartDisassembly = async () => {
    if (!newScrapId) return;
    const result = await createDisassembly.mutateAsync({ scrapId: newScrapId, notes: newNotes });
    setShowNewDialog(false);
    setNewNotes("");
    setSelectedScrapId(null);
    // Open panel for the new disassembly
    if (result?.id) {
      setSelectedScrapId(newScrapId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Recycle className="h-6 w-6" /> Desmontagem de Sucata
        </h1>
        <Card className="px-4 py-2">
          <span className="text-sm text-muted-foreground">Valor Recuperado: </span>
          <span className="font-bold text-primary">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(recoveryValue)}
          </span>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar sucata..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sucatas Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma sucata cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Peças Aproveitáveis</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((scrap) => (
                  <TableRow key={scrap.id}>
                    <TableCell className="font-medium">{scrap.device_type}</TableCell>
                    <TableCell>{[scrap.brand, scrap.model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{scrap.condition || "N/A"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{scrap.salvageable_parts || "—"}</TableCell>
                    <TableCell>{scrap.location || "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNewScrapId(scrap.id);
                          setShowNewDialog(true);
                        }}
                      >
                        <Wrench className="h-3.5 w-3.5 mr-1" /> Desmontar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistoryScrapId(scrap.id)}
                      >
                        <History className="h-3.5 w-3.5 mr-1" /> Histórico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Disassembly Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Desmontagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Observações da desmontagem..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleStartDisassembly} disabled={createDisassembly.isPending}>
              <PackagePlus className="h-4 w-4 mr-1" /> Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disassembly Panel (registrar peças) */}
      {selectedScrapId && (
        <DisassemblyPanel scrapId={selectedScrapId} onClose={() => setSelectedScrapId(null)} />
      )}

      {/* History Panel */}
      {historyScrapId && (
        <ScrapHistoryPanel scrapId={historyScrapId} onClose={() => setHistoryScrapId(null)} />
      )}
    </div>
  );
}
