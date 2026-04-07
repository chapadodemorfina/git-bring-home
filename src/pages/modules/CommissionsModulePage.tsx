import { Percent, DollarSign, BarChart3, CalendarClock } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import CommissionManagementPage from "@/modules/collection-points/pages/CommissionManagementPage";
import CpCommissionPeriodsPage from "@/modules/collection-points/pages/CpCommissionPeriodsPage";
import CpReportsPage from "@/modules/collection-points/pages/CpReportsPage";
import CommissionsPage from "@/modules/commissions/pages/CommissionsPage";
import CommissionsHubDashboard from "@/modules/commissions/components/CommissionsHubDashboard";
import { Separator } from "@/components/ui/separator";

export default function CommissionsModulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Percent className="h-6 w-6" />
          Comissões
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Comissões de parceiros e equipe</p>
      </div>

      <CommissionsHubDashboard />

      <Separator />

      <ModulePage
        title=""
        tabs={[
          { key: "periods", label: "Fechamento Parceiros", icon: CalendarClock, content: <CpCommissionPeriodsPage /> },
          { key: "partners", label: "Comissões Individuais", icon: DollarSign, content: <CommissionManagementPage /> },
          { key: "reports", label: "Relatório Parceiros", icon: BarChart3, content: <CpReportsPage /> },
          { key: "team", label: "Comissões Equipe", icon: Percent, content: <CommissionsPage /> },
        ]}
      />
    </div>
  );
}
