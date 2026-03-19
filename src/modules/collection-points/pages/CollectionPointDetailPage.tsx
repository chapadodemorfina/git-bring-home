import { useParams, useNavigate } from "react-router-dom";
import { Edit, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollectionPoint } from "../hooks/useCollectionPoints";
import { commissionTypeLabels, defaultCpSettings } from "../types";
import TransferTracker from "../components/TransferTracker";
import CommissionsPanel from "../components/CommissionsPanel";
import OperatorsPanel from "../components/OperatorsPanel";
import PermissionsPanel from "../components/PermissionsPanel";

export default function CollectionPointDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: cp, isLoading } = useCollectionPoint(id);

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!cp) return <p className="text-destructive">Ponto de coleta não encontrado.</p>;

  const addressParts = [cp.street, cp.number, cp.complement, cp.neighborhood, cp.city, cp.state].filter(Boolean);
  const settings = { ...defaultCpSettings, ...cp.settings };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6" /> {cp.name}</h1>
          {cp.company_name && <p className="text-muted-foreground">{cp.company_name}</p>}
        </div>
        <div className="flex gap-2">
          <Badge variant={cp.is_active ? "default" : "secondary"} className="h-7">{cp.is_active ? "Ativo" : "Inativo"}</Badge>
          <Button variant="outline" onClick={() => navigate(`/collection-points/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Informações de Contato</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Responsável:</span> {cp.responsible_person || "—"}</p>
            <p><span className="text-muted-foreground">Telefone:</span> {cp.phone || "—"}</p>
            <p><span className="text-muted-foreground">WhatsApp:</span> {cp.whatsapp || "—"}</p>
            <p><span className="text-muted-foreground">Email:</span> {cp.email || "—"}</p>
            <p><span className="text-muted-foreground">Endereço:</span> {addressParts.join(", ") || "—"}</p>
            {cp.zip_code && <p><span className="text-muted-foreground">CEP:</span> {cp.zip_code}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Comissão</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Tipo:</span> {commissionTypeLabels[cp.commission_type]}</p>
            <p><span className="text-muted-foreground">Valor:</span> {cp.commission_type === "percentage" ? `${cp.commission_value}%` : `R$ ${cp.commission_value.toFixed(2)}`}</p>
          </CardContent>
        </Card>
      </div>

      {cp.notes && (
        <Card>
          <CardContent className="pt-4 text-sm">
            <span className="text-muted-foreground">Observações:</span> {cp.notes}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transfers">
        <TabsList>
          <TabsTrigger value="transfers">Transferências</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="operators">Operadores</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>
        <TabsContent value="transfers"><TransferTracker cpId={id} /></TabsContent>
        <TabsContent value="commissions"><CommissionsPanel cpId={id!} /></TabsContent>
        <TabsContent value="operators"><OperatorsPanel cpId={id!} /></TabsContent>
        <TabsContent value="permissions">
          <PermissionsPanel settings={settings} onChange={() => {}} readOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}
