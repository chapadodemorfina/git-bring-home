import { ClipboardList, ScanLine, ListChecks, ShieldCheck } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import ServiceOrdersListPage from "@/modules/service-orders/pages/ServiceOrdersListPage";
import ScanServiceOrderPage from "@/modules/service-orders/pages/ScanServiceOrderPage";
import WorkQueuesPage from "@/pages/WorkQueuesPage";
import WarrantiesPage from "@/modules/repair/pages/WarrantiesPage";

export default function OperationModulePage() {
  return (
    <ModulePage
      title="Operação"
      description="Gestão de ordens de serviço, filas e garantias"
      icon={ClipboardList}
      tabs={[
        { key: "orders", label: "Ordens de Serviço", icon: ClipboardList, content: <ServiceOrdersListPage /> },
        { key: "scan", label: "Escanear OS", icon: ScanLine, content: <ScanServiceOrderPage /> },
        { key: "queues", label: "Filas de Trabalho", icon: ListChecks, content: <WorkQueuesPage /> },
        { key: "warranties", label: "Garantias", icon: ShieldCheck, content: <WarrantiesPage /> },
      ]}
    />
  );
}
