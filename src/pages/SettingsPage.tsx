import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Save, Building2, MapPin, Phone, FileText,
  Shield, Settings2, Palette, Key, Eye, EyeOff
} from "lucide-react";
import { LogoUpload } from "@/components/settings/LogoUpload";

const db = supabase as any;

const ALL_KEYS = [
  "company_name", "company_legal_name", "company_cnpj", "company_logo_url", "company_primary_color",
  "company_street", "company_number", "company_neighborhood", "company_city", "company_state", "company_zip",
  "company_phone", "company_email", "whatsapp_support_number", "company_website", "company_instagram",
  "pdf_show_qrcode", "pdf_show_signatures", "pdf_show_terms", "pdf_mode",
  "terms_service", "terms_warranty", "terms_abandonment",
  "default_warranty_days", "default_whatsapp_message",
  "api_key_stripe", "api_key_whatsapp", "api_key_custom",
];

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings-full"],
    queryFn: async () => {
      const { data, error } = await db
        .from("app_settings")
        .select("key, value")
        .in("key", ALL_KEYS);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => { if (settings) setV({ ...settings }); }, [settings]);

  const set = (key: string, val: string) => setV((prev) => ({ ...prev, [key]: val }));
  const toggle = (key: string) => set(key, v[key] === "true" ? "false" : "true");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = ALL_KEYS.map((key) =>
        db.from("app_settings").upsert({ key, value: v[key] || "" }, { onConflict: "key" })
      );
      const results = await Promise.all(updates);
      const err = results.find((r: any) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings-full"] });
      qc.invalidateQueries({ queryKey: ["company-settings-all"] });
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Configurações gerais do sistema e personalização de documentos</p>
      </div>

      {/* 1. Identidade */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Identidade da Empresa</CardTitle>
          </div>
          <CardDescription>Dados institucionais usados em PDFs, recibos e portal do cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da Empresa" value={v.company_name} onChange={(val) => set("company_name", val)} placeholder="Minha Empresa" />
            <Field label="Razão Social" value={v.company_legal_name} onChange={(val) => set("company_legal_name", val)} placeholder="Empresa Ltda" />
            <Field label="CNPJ" value={v.company_cnpj} onChange={(val) => set("company_cnpj", val)} placeholder="00.000.000/0001-00" />
            <div>
              <LogoUpload currentUrl={v.company_logo_url || ""} onUrlChange={(url) => set("company_logo_url", url)} />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Cor Principal
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={v.company_primary_color || "#1e40af"}
                  onChange={(e) => set("company_primary_color", e.target.value)}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={v.company_primary_color || "#1e40af"}
                  onChange={(e) => set("company_primary_color", e.target.value)}
                  className="w-28 font-mono text-sm"
                  placeholder="#1e40af"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Endereço */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Endereço</CardTitle>
          </div>
          <CardDescription>Endereço exibido nos documentos e recibos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Field label="Rua" value={v.company_street} onChange={(val) => set("company_street", val)} placeholder="Av. Principal" />
            </div>
            <Field label="Número" value={v.company_number} onChange={(val) => set("company_number", val)} placeholder="123" />
            <Field label="Bairro" value={v.company_neighborhood} onChange={(val) => set("company_neighborhood", val)} placeholder="Centro" />
            <Field label="Cidade" value={v.company_city} onChange={(val) => set("company_city", val)} placeholder="São Paulo" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estado" value={v.company_state} onChange={(val) => set("company_state", val)} placeholder="SP" />
              <Field label="CEP" value={v.company_zip} onChange={(val) => set("company_zip", val)} placeholder="00000-000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Contato */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Contato</CardTitle>
          </div>
          <CardDescription>Canais de comunicação da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Telefone" value={v.company_phone} onChange={(val) => set("company_phone", val)} placeholder="(11) 0000-0000" />
            <Field label="WhatsApp" value={v.whatsapp_support_number} onChange={(val) => set("whatsapp_support_number", val)} placeholder="5511999999999" />
            <Field label="Email" value={v.company_email} onChange={(val) => set("company_email", val)} placeholder="contato@empresa.com" />
            <Field label="Site (opcional)" value={v.company_website} onChange={(val) => set("company_website", val)} placeholder="https://empresa.com" />
            <Field label="Instagram (opcional)" value={v.company_instagram} onChange={(val) => set("company_instagram", val)} placeholder="@empresa" />
          </div>
        </CardContent>
      </Card>

      {/* 4. PDF */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configurações do PDF</CardTitle>
          </div>
          <CardDescription>Controle o que aparece nos PDFs gerados pelo sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ToggleField label="Exibir QR Code" checked={v.pdf_show_qrcode !== "false"} onToggle={() => toggle("pdf_show_qrcode")} description="QR de acompanhamento do reparo" />
            <ToggleField label="Exibir Assinaturas" checked={v.pdf_show_signatures !== "false"} onToggle={() => toggle("pdf_show_signatures")} description="Campos de assinatura cliente/técnico" />
            <ToggleField label="Exibir Termos" checked={v.pdf_show_terms !== "false"} onToggle={() => toggle("pdf_show_terms")} description="Termos de serviço e garantia" />
          </div>
          <Separator />
          <div className="max-w-xs space-y-2">
            <Label>Modo do PDF</Label>
            <Select value={v.pdf_mode || "compact"} onValueChange={(val) => set("pdf_mode", val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto (1 página prioritária)</SelectItem>
                <SelectItem value="full">Completo (múltiplas páginas)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">No modo compacto, o sistema prioriza manter tudo em uma página</p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Termos e Garantia */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Termos e Garantia</CardTitle>
          </div>
          <CardDescription>Textos exibidos nos PDFs de Ordem de Serviço</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Termos de Serviço</Label>
            <Textarea
              value={v.terms_service || ""}
              onChange={(e) => set("terms_service", e.target.value)}
              placeholder="1. O cliente declara que o equipamento foi entregue nas condições descritas neste documento.&#10;2. A empresa não se responsabiliza por dados armazenados no dispositivo.&#10;3. O prazo estimado é uma previsão e pode sofrer alterações."
              rows={5}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Condições de Garantia</Label>
            <Textarea
              value={v.terms_warranty || ""}
              onChange={(e) => set("terms_warranty", e.target.value)}
              placeholder="A garantia do serviço é de 90 dias a partir da data de entrega, cobrindo apenas o serviço realizado."
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Política de Abandono</Label>
            <Textarea
              value={v.terms_abandonment || ""}
              onChange={(e) => set("terms_abandonment", e.target.value)}
              placeholder="Equipamentos não retirados em até 90 dias após a conclusão serão considerados abandonados."
              rows={3}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. Operacional */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Operacional</CardTitle>
          </div>
          <CardDescription>Padrões operacionais do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Prazo Padrão de Garantia (dias)</Label>
              <Input
                type="number"
                value={v.default_warranty_days || "90"}
                onChange={(e) => set("default_warranty_days", e.target.value)}
                min={0}
                className="w-32"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Mensagem Padrão de WhatsApp</Label>
            <Textarea
              value={v.default_whatsapp_message || ""}
              onChange={(e) => set("default_whatsapp_message", e.target.value)}
              placeholder="Olá! Aqui é da {empresa}. Sua ordem de serviço {os_numero} está {status}."
              rows={3}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Variáveis: {"{empresa}"}, {"{os_numero}"}, {"{status}"}, {"{cliente}"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="shadow-lg"
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

/* ─── Reusable sub-components ─── */

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ToggleField({ label, checked, onToggle, description }: {
  label: string; checked: boolean; onToggle: () => void; description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Switch checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
