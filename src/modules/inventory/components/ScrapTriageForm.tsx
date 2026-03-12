import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck } from "lucide-react";
import { useCreateTriage } from "../hooks/useScrapDisassembly";

const checks = [
  { key: "still_powers_on", label: "Ainda liga?" },
  { key: "board_responsive", label: "Placa responde?" },
  { key: "screen_usable", label: "Tela presta para teste?" },
  { key: "carcass_usable", label: "Carcaça aproveita?" },
  { key: "camera_usable", label: "Câmera aproveita?" },
  { key: "connectors_usable", label: "Conectores aproveitam?" },
  { key: "battery_usable", label: "Bateria aproveita?" },
  { key: "buttons_flex_usable", label: "Botões/flex aproveitam?" },
  { key: "speaker_mic_usable", label: "Alto-falante/microfone aproveitam?" },
  { key: "charge_module_usable", label: "Módulo de carga aproveita?" },
];

interface Props {
  scrapId: string;
}

export function ScrapTriageForm({ scrapId }: Props) {
  const createTriage = useCreateTriage();
  const [form, setForm] = useState<Record<string, any>>({
    still_powers_on: false,
    board_responsive: false,
    screen_usable: false,
    carcass_usable: false,
    camera_usable: false,
    connectors_usable: false,
    battery_usable: false,
    buttons_flex_usable: false,
    speaker_mic_usable: false,
    charge_module_usable: false,
    destination: "",
    recovery_potential: "",
    estimated_value: 0,
    notes: "",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    await createTriage.mutateAsync({ ...form, scrap_id: scrapId });
    // Reset form
    setForm({
      still_powers_on: false, board_responsive: false, screen_usable: false,
      carcass_usable: false, camera_usable: false, connectors_usable: false,
      battery_usable: false, buttons_flex_usable: false, speaker_mic_usable: false,
      charge_module_usable: false, destination: "", recovery_potential: "",
      estimated_value: 0, notes: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" /> Nova Triagem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {checks.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <Checkbox
                id={c.key}
                checked={form[c.key]}
                onCheckedChange={(v) => set(c.key, !!v)}
              />
              <label htmlFor={c.key} className="text-sm cursor-pointer">{c.label}</label>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Destino</Label>
            <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Ex: Desmontagem, Descarte..." />
          </div>
          <div>
            <Label>Potencial de Reaproveitamento</Label>
            <Input value={form.recovery_potential} onChange={(e) => set("recovery_potential", e.target.value)} placeholder="Alto, Médio, Baixo" />
          </div>
          <div>
            <Label>Valor Estimado (R$)</Label>
            <Input type="number" min={0} step={0.01} value={form.estimated_value} onChange={(e) => set("estimated_value", Number(e.target.value))} />
          </div>
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={createTriage.isPending}>
            <ClipboardCheck className="h-4 w-4 mr-1" /> Registrar Triagem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
