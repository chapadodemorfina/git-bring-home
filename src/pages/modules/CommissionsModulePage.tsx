import { Percent, DollarSign, BarChart3 } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import CommissionManagementPage from "@/modules/collection-points/pages/CommissionManagementPage";
import CpReportsPage from "@/modules/collection-points/pages/CpReportsPage";
import CommissionsPage from "@/modules/commissions/pages/CommissionsPage";

export default function CommissionsModulePage() {
  return (
    <ModulePage
      title="Comissões"
      description="Comissões de parceiros e equipe"
      icon={Percent}
      tabs={[
        { key: "partners", label: "Comissões Parceiros", icon: DollarSign, content: <CommissionManagementPage /> },
        { key: "reports", label: "Relatório Parceiros", icon: BarChart3, content: <CpReportsPage /> },
        { key: "team", label: "Comissões Equipe", icon: Percent, content: <CommissionsPage /> },
      ]}
    />
  );
}
