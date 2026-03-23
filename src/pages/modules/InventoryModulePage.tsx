import { Package, Recycle, Truck } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import ProductsListPage from "@/modules/inventory/pages/ProductsListPage";
import ScrapListPage from "@/modules/inventory/pages/ScrapListPage";
import LogisticsListPage from "@/modules/logistics/pages/LogisticsListPage";

export default function InventoryModulePage() {
  return (
    <ModulePage
      title="Estoque"
      description="Peças, sucatas e logística"
      icon={Package}
      tabs={[
        { key: "products", label: "Estoque & Peças", icon: Package, content: <ProductsListPage /> },
        { key: "scrap", label: "Sucata & Reaproveitamento", icon: Recycle, content: <ScrapListPage /> },
        { key: "logistics", label: "Logística", icon: Truck, content: <LogisticsListPage /> },
      ]}
    />
  );
}
