import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wrench, ClipboardCheck, History, Box } from "lucide-react";
import {
  useScrapItem,
  useUpdateScrap,
  useScrapTriages,
  useScrapDisassemblies,
  useAllRecoveredPartsForScrap,
  useScrapCarcassDetails,
} from "../hooks/useScrapDisassembly";
import { ScrapTriageForm } from "../components/ScrapTriageForm";
import { ScrapCarcassForm } from "../components/ScrapCarcassForm";
import { DisassemblyPanel } from "../components/DisassemblyPanel";
import { ScrapHistoryPanel } from "../components/ScrapHistoryPanel";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  aguardando_triagem: "Aguardando Triagem",
  triada: "Triada",
  desmontada: "Desmontada",
  pecas_recuperadas: "Peças Recuperadas",
  descartada: "Descartada",
  vendida: "Vendida",
  usada_internamente: "Usada Internamente",
};

const categoryLabels: Record<string, string> = {
  aparelho_completo: "Aparelho Completo",
  placa: "Placa",
  carcaca: "Carcaça",
  tela_quebrada: "Tela Quebrada",
  lote_pecas: "Lote de Peças",
  acessorio: "Acessório",
};

export default function ScrapDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: scrap, isLoading } = useScrapItem(id);
  const updateScrap = useUpdateScrap();
  const { data: triages = [] } = useScrapTriages(id);
  const { data: allParts = [] } = useAllRecoveredPartsForScrap(id);
  const [showDisassembly, setShowDisassembly] = useState(false);

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  const totalRecovered = allParts
    .filter((p) => p.added_to_stock)
    .reduce((sum, p) => sum + (p.products?.cost_price || 0) * p.quantity, 0);

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando...</p>;
  if (!scrap) return <p className="p-6 text-muted-foreground">Sucata não encontrada.</p>;

  const handleStatusChange = async (newStatus: string) => {
    await updateScrap.mutateAsync({ id: scrap.id, status: newStatus });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => navigate("/inventory/scrap")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {scrap.device_type} — {[scrap.brand, scrap.model].filter(Boolean).join(" ") || "Sem identificação"}
          </h1>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge variant="outline">{categoryLabels[scrap.scrap_category || ""] || "—"}</Badge>
            <Badge variant="outline">{statusLabels[scrap.status || ""] || scrap.status || "—"}</Badge>
            {scrap.imei_serial && <Badge variant="secondary">{scrap.imei_serial}</Badge>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={scrap.status || ""} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Alterar status" /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Valor Estimado</p>
            <p className="text-xl font-bold">{fmt.format(scrap.estimated_recovery_value || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Valor Recuperado</p>
            <p className="text-xl font-bold text-green-600">{fmt.format(totalRecovered)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Peças Registradas</p>
            <p className="text-xl font-bold">{allParts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Informações</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-muted-foreground">Condição</dt><dd>{scrap.condition || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cor</dt><dd>{scrap.color || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Local</dt><dd>{scrap.location || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cadastro</dt><dd>{format(new Date(scrap.created_at), "dd/MM/yyyy HH:mm")}</dd></div>
            {scrap.service_orders?.order_number && (
              <div><dt className="text-muted-foreground">OS Origem</dt><dd>{scrap.service_orders.order_number}</dd></div>
            )}
            {scrap.customers?.full_name && (
              <div><dt className="text-muted-foreground">Cliente Origem</dt><dd>{scrap.customers.full_name}</dd></div>
            )}
            {scrap.salvageable_parts && (
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Peças Aproveitáveis</dt><dd>{scrap.salvageable_parts}</dd></div>
            )}
            {scrap.notes && (
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Observações</dt><dd>{scrap.notes}</dd></div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="triage">
        <TabsList>
          <TabsTrigger value="triage"><ClipboardCheck className="h-4 w-4 mr-1" /> Triagem</TabsTrigger>
          <TabsTrigger value="disassembly"><Wrench className="h-4 w-4 mr-1" /> Desmontagem</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Histórico</TabsTrigger>
          {scrap.scrap_category === "carcaca" && (
            <TabsTrigger value="carcass"><Box className="h-4 w-4 mr-1" /> Carcaça</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="triage" className="space-y-4">
          <ScrapTriageForm scrapId={scrap.id} />
          {triages.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Triagens Anteriores</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {triages.map((t) => (
                  <div key={t.id} className="border rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</span>
                      <span className="text-muted-foreground">Técnico: {t.profiles?.full_name || "—"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.still_powers_on && <Badge variant="outline" className="text-xs">Liga</Badge>}
                      {t.board_responsive && <Badge variant="outline" className="text-xs">Placa OK</Badge>}
                      {t.screen_usable && <Badge variant="outline" className="text-xs">Tela</Badge>}
                      {t.carcass_usable && <Badge variant="outline" className="text-xs">Carcaça</Badge>}
                      {t.camera_usable && <Badge variant="outline" className="text-xs">Câmera</Badge>}
                      {t.connectors_usable && <Badge variant="outline" className="text-xs">Conectores</Badge>}
                      {t.battery_usable && <Badge variant="outline" className="text-xs">Bateria</Badge>}
                      {t.buttons_flex_usable && <Badge variant="outline" className="text-xs">Botões/Flex</Badge>}
                      {t.speaker_mic_usable && <Badge variant="outline" className="text-xs">Alto-falante/Mic</Badge>}
                      {t.charge_module_usable && <Badge variant="outline" className="text-xs">Módulo Carga</Badge>}
                    </div>
                    {t.destination && <p>Destino: {t.destination}</p>}
                    {t.recovery_potential && <p>Potencial: {t.recovery_potential}</p>}
                    <p>Valor estimado: {fmt.format(t.estimated_value || 0)}</p>
                    {t.notes && <p className="text-muted-foreground">{t.notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="disassembly" className="space-y-4">
          {!showDisassembly && (
            <Button onClick={() => setShowDisassembly(true)}>
              <Wrench className="h-4 w-4 mr-1" /> Iniciar / Continuar Desmontagem
            </Button>
          )}
          {showDisassembly && (
            <DisassemblyPanel scrapId={scrap.id} onClose={() => setShowDisassembly(false)} />
          )}
        </TabsContent>

        <TabsContent value="history">
          <ScrapHistoryPanel scrapId={scrap.id} onClose={() => {}} hideClose />
        </TabsContent>

        {scrap.scrap_category === "carcaca" && (
          <TabsContent value="carcass">
            <ScrapCarcassForm scrapId={scrap.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
