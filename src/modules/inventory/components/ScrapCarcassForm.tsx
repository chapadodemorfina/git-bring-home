import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box } from "lucide-react";
import { useScrapCarcassDetails, useUpsertCarcassDetails } from "../hooks/useScrapDisassembly";

const checkItems = [
  { key: "back_cover_ok", label: "Tampa traseira OK" },
  { key: "frame_ok", label: "Aro/chassi OK" },
  { key: "buttons_ok", label: "Botões OK" },
  { key: "sim_tray_ok", label: "Gaveta chip OK" },
  { key: "lenses_ok", label: "Lentes OK" },
];

const purposes = [
  { value: "vender", label: "Vender" },
  { value: "usar_reparo", label: "Usar em Reparo" },
  { value: "estoque", label: "Manter em Estoque" },
];

interface Props {
  scrapId: string;
}

export function ScrapCarcassForm({ scrapId }: Props) {
  const { data: existing } = useScrapCarcassDetails(scrapId);
  const upsert = useUpsertCarcassDetails();

  const [form, setForm] = useState<Record<string, any>>({
    color: "",
    aesthetic_state: "",
    back_cover_ok: false,
    frame_ok: false,
    buttons_ok: false,
    sim_tray_ok: false,
    lenses_ok: false,
    missing_details: "",
    purpose: "estoque",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        color: existing.color || "",
        aesthetic_state: existing.aesthetic_state || "",
        back_cover_ok: existing.back_cover_ok,
        frame_ok: existing.frame_ok,
        buttons_ok: existing.buttons_ok,
        sim_tray_ok: existing.sim_tray_ok,
        lenses_ok: existing.lenses_ok,
        missing_details: existing.missing_details || "",
        purpose: existing.purpose || "estoque",
      });
    }
  }, [existing]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    await upsert.mutateAsync({ scrap_id: scrapId, ...form });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Box className="h-5 w-5" /> Detalhes da Carcaça
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Cor</Label>
            <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
          </div>
          <div>
            <Label>Estado Estético</Label>
            <Input value={form.aesthetic_state} onChange={(e) => set("aesthetic_state", e.target.value)} placeholder="Ex: Bom, Arranhado, Trincado" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {checkItems.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <Checkbox id={`carcass-${c.key}`} checked={form[c.key]} onCheckedChange={(v) => set(c.key, !!v)} />
              <label htmlFor={`carcass-${c.key}`} className="text-sm cursor-pointer">{c.label}</label>
            </div>
          ))}
        </div>

        <div>
          <Label>Detalhes Faltando</Label>
          <Textarea value={form.missing_details} onChange={(e) => set("missing_details", e.target.value)} placeholder="Descreva pequenos detalhes faltando..." />
        </div>

        <div>
          <Label>Finalidade</Label>
          <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {purposes.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={upsert.isPending}>Salvar Carcaça</Button>
        </div>
      </CardContent>
    </Card>
  );
}
