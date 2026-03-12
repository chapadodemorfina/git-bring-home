import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useCreateScrap } from "../hooks/useScrapDisassembly";

const categories = [
  { value: "aparelho_completo", label: "Aparelho Completo" },
  { value: "placa", label: "Placa" },
  { value: "carcaca", label: "Carcaça" },
  { value: "tela_quebrada", label: "Tela Quebrada" },
  { value: "lote_pecas", label: "Lote de Peças" },
  { value: "acessorio", label: "Acessório" },
];

const conditions = [
  { value: "irrecuperavel", label: "Irrecuperável" },
  { value: "recuperavel_pecas", label: "Recuperável para Peças" },
  { value: "carcaca_aproveitavel", label: "Carcaça Aproveitável" },
  { value: "placa_estudo", label: "Placa para Estudo" },
  { value: "tela_teste", label: "Tela para Teste" },
];

export default function ScrapCreatePage() {
  const navigate = useNavigate();
  const createScrap = useCreateScrap();

  const [form, setForm] = useState({
    device_type: "",
    brand: "",
    model: "",
    scrap_category: "aparelho_completo",
    condition: "recuperavel_pecas",
    imei_serial: "",
    color: "",
    location: "",
    salvageable_parts: "",
    notes: "",
    estimated_recovery_value: 0,
  });

  const set = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!form.device_type) return;
    await createScrap.mutateAsync(form);
    navigate("/inventory/scrap");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate("/inventory/scrap")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <h1 className="text-2xl font-bold">Cadastrar Sucata</h1>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo do Equipamento *</Label>
              <Input value={form.device_type} onChange={(e) => set("device_type", e.target.value)} placeholder="Ex: Celular, Notebook..." />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.scrap_category} onValueChange={(v) => set("scrap_category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
            <div>
              <Label>IMEI / Serial / Patrimônio</Label>
              <Input value={form.imei_serial} onChange={(e) => set("imei_serial", e.target.value)} />
            </div>
            <div>
              <Label>Cor</Label>
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
            </div>
            <div>
              <Label>Condição</Label>
              <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Local Físico</Label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: Prateleira A3" />
            </div>
            <div>
              <Label>Valor Estimado de Recuperação</Label>
              <Input type="number" min={0} step={0.01} value={form.estimated_recovery_value} onChange={(e) => set("estimated_recovery_value", Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Peças Aproveitáveis</Label>
            <Textarea value={form.salvageable_parts} onChange={(e) => set("salvageable_parts", e.target.value)} placeholder="Descreva as peças que podem ser reaproveitadas..." />
          </div>
          <div>
            <Label>Observações Técnicas</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={createScrap.isPending || !form.device_type}>
              Cadastrar Sucata
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
