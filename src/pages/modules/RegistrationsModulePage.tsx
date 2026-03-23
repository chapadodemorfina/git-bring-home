import { UserRound, Monitor, MapPin, Users } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import CustomersListPage from "@/modules/customers/pages/CustomersListPage";
import DevicesListPage from "@/modules/devices/pages/DevicesListPage";
import CollectionPointsListPage from "@/modules/collection-points/pages/CollectionPointsListPage";
import UsersListPage from "@/modules/users/pages/UsersListPage";
import RegistrationsHubDashboard from "@/components/registrations/RegistrationsHubDashboard";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

export default function RegistrationsModulePage() {
  const { hasRole } = useAuth();
  const isAdminOrManager = hasRole("admin") || hasRole("manager");

  const tabs = [
    { key: "customers", label: "Clientes", icon: UserRound, content: <CustomersListPage /> },
    { key: "devices", label: "Dispositivos", icon: Monitor, content: <DevicesListPage /> },
    ...(isAdminOrManager
      ? [
          { key: "collection-points", label: "Pontos de Coleta", icon: MapPin, content: <CollectionPointsListPage /> },
          { key: "team", label: "Equipe", icon: Users, content: <UsersListPage /> },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserRound className="h-6 w-6" />
          Cadastros
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Clientes, dispositivos, pontos de coleta e equipe</p>
      </div>

      <RegistrationsHubDashboard />

      <Separator />

      <ModulePage title="" tabs={tabs} />
    </div>
  );
}
