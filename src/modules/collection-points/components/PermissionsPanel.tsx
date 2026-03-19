import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import {
  type CollectionPointSettings,
  cpSettingLabels,
  defaultCpSettings,
} from "../types";

interface Props {
  settings: CollectionPointSettings;
  onChange: (settings: CollectionPointSettings) => void;
  readOnly?: boolean;
}

const groups: { title: string; keys: (keyof CollectionPointSettings)[] }[] = [
  {
    title: "Clientes",
    keys: ["create_customers", "edit_customers"],
  },
  {
    title: "Ordens de Serviço",
    keys: ["create_service_orders", "view_only_own_orders", "close_orders", "cancel_orders"],
  },
  {
    title: "Orçamentos",
    keys: ["view_quotes", "approve_quotes"],
  },
  {
    title: "Outros",
    keys: ["upload_attachments", "view_status", "view_financial"],
  },
];

export default function PermissionsPanel({ settings, onChange, readOnly }: Props) {
  const merged = { ...defaultCpSettings, ...settings };

  const toggle = (key: keyof CollectionPointSettings) => {
    onChange({ ...merged, [key]: !merged[key] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" /> Permissões do Parceiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{g.title}</p>
            <div className="space-y-2">
              {g.keys.map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm cursor-pointer">
                    {cpSettingLabels[key]}
                  </Label>
                  <Switch
                    id={key}
                    checked={merged[key]}
                    onCheckedChange={() => toggle(key)}
                    disabled={readOnly}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
