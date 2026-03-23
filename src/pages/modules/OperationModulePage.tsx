import { ClipboardList, ScanLine, ListChecks, ShieldCheck } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import ServiceOrdersListPage from "@/modules/service-orders/pages/ServiceOrdersListPage";
import ScanServiceOrderPage from "@/modules/service-orders/pages/ScanServiceOrderPage";
import WorkQueuesPage from "@/pages/WorkQueuesPage";
import WarrantiesPage from "@/modules/repair/pages/WarrantiesPage";
import { OperationDashboard } from "@/modules/service-orders/components/OperationDashboard";
import { Separator } from "@/components/ui/separator";

export default function OperationModulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Operação
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Central operacional — ordens de serviço, filas e garantias</p>
      </div>

      <OperationDashboard />

      <Separator />

      <ModulePage
        title=""
        tabs={[
          { key: "orders", label: "Ordens de Serviço", icon: ClipboardList, content: <ServiceOrdersListPage /> },
          { key: "scan", label: "Escanear OS", icon: ScanLine, content: <ScanServiceOrderPage /> },
          { key: "queues", label: "Filas de Trabalho", icon: ListChecks, content: <WorkQueuesPage /> },
          { key: "warranties", label: "Garantias", icon: ShieldCheck, content: <WarrantiesPage /> },
        ]}
      />
    </div>
  );
}
