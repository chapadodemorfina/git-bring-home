import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CollectionPointForm from "../components/CollectionPointForm";
import { useCollectionPoint, useUpdateCollectionPoint } from "../hooks/useCollectionPoints";
import type { CollectionPointSettings, CollectionPointFormData } from "../types";
import { defaultCpSettings } from "../types";

export default function CollectionPointEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: cp, isLoading } = useCollectionPoint(id);
  const update = useUpdateCollectionPoint();

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!cp) return <p className="text-destructive">Ponto de coleta não encontrado.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Editar — {cp.name}</CardTitle></CardHeader>
        <CardContent>
          <CollectionPointForm
            isLoading={update.isPending}
            defaultIsActive={cp.is_active}
            defaultSettings={{ ...defaultCpSettings, ...cp.settings }}
            defaultValues={{
              name: cp.name,
              company_name: cp.company_name || "",
              responsible_person: cp.responsible_person || "",
              phone: cp.phone || "",
              whatsapp: cp.whatsapp || "",
              email: cp.email || "",
              street: cp.street || "",
              number: cp.number || "",
              complement: cp.complement || "",
              neighborhood: cp.neighborhood || "",
              city: cp.city || "",
              state: cp.state || "",
              zip_code: cp.zip_code || "",
              notes: cp.notes || "",
              commission_type: cp.commission_type,
              commission_value: cp.commission_value,
            }}
            onSubmit={async (data: CollectionPointFormData, settings: CollectionPointSettings, isActive: boolean) => {
              await update.mutateAsync({ id: id!, values: data, settings, isActive });
              navigate(`/collection-points/${id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
