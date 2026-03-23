import { UserRound, Monitor, MapPin, Users } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import CustomersListPage from "@/modules/customers/pages/CustomersListPage";
import DevicesListPage from "@/modules/devices/pages/DevicesListPage";
import CollectionPointsListPage from "@/modules/collection-points/pages/CollectionPointsListPage";
import UsersListPage from "@/modules/users/pages/UsersListPage";
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
    <ModulePage
      title="Cadastros"
      description="Clientes, dispositivos, pontos de coleta e equipe"
      icon={UserRound}
      tabs={tabs}
    />
  );
}
