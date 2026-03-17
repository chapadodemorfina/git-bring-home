import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, MinusCircle,
  Smartphone, Monitor, CircuitBoard, Battery, Volume2,
  Usb, Wifi, Camera, Fingerprint, ChevronDown, ChevronUp,
} from "lucide-react";

export interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "ok" | "damaged" | "na";
  notes: string;
}

const DEFAULT_ITEMS: Omit<ChecklistItem, "status" | "notes">[] = [
  { id: "screen", label: "Tela / Display", icon: Monitor },
  { id: "body", label: "Carcaça / Estrutura", icon: Smartphone },
  { id: "buttons", label: "Botões", icon: CircuitBoard },
  { id: "charging", label: "Porta de Carga", icon: Usb },
  { id: "battery", label: "Bateria", icon: Battery },
  { id: "speakers", label: "Alto-falante / Mic", icon: Volume2 },
  { id: "camera", label: "Câmera", icon: Camera },
  { id: "connectivity", label: "Wi-Fi / Bluetooth", icon: Wifi },
  { id: "biometrics", label: "Biometria / Face ID", icon: Fingerprint },
];

const statusConfig = {
  ok: { label: "OK", icon: CheckCircle2, className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700" },
  damaged: { label: "Avariado", icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700" },
  na: { label: "N/A", icon: MinusCircle, className: "bg-muted text-muted-foreground border-border" },
};

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function IntakeChecklist({ value, onChange }: Props) {
  const parsed = parseChecklist(value);
  const [expanded, setExpanded] = useState<string | null>(null);

  function parseChecklist(val: string): ChecklistItem[] {
    try {
      const data = JSON.parse(val);
      if (Array.isArray(data)) {
        return DEFAULT_ITEMS.map((def) => {
          const found = data.find((d: any) => d.id === def.id);
          return { ...def, status: found?.status || "ok", notes: found?.notes || "" };
        });
      }
    } catch {}
    return DEFAULT_ITEMS.map((def) => ({ ...def, status: "ok" as const, notes: "" }));
  }

  function update(id: string, patch: Partial<Pick<ChecklistItem, "status" | "notes">>) {
    const updated = parsed.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    onChange(JSON.stringify(updated.map(({ id, status, notes }) => ({ id, status, notes }))));
  }

  const damagedCount = parsed.filter((i) => i.status === "damaged").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Checklist de Entrada</CardTitle>
          {damagedCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {damagedCount} avariado{damagedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {parsed.map((item) => {
          const Icon = DEFAULT_ITEMS.find((d) => d.id === item.id)?.icon || Smartphone;
          const isExpanded = expanded === item.id;
          const cfg = statusConfig[item.status];

          return (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 min-w-0 truncate">{item.label}</span>

                <div className="flex gap-1">
                  {(["ok", "damaged", "na"] as const).map((st) => {
                    const stCfg = statusConfig[st];
                    const StIcon = stCfg.icon;
                    const isActive = item.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => update(item.id, { status: st })}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-all",
                          isActive ? stCfg.className : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                      >
                        <StIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">{stCfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-2 pb-2">
                  <Textarea
                    rows={2}
                    placeholder="Observações sobre este item..."
                    value={item.notes}
                    onChange={(e) => update(item.id, { notes: e.target.value })}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
