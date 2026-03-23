import { ShoppingBag, Calculator, MonitorSmartphone } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import QuotesListPage from "@/modules/quotes/pages/QuotesListPage";
import SalesListPage from "@/modules/sales/pages/SalesListPage";

export default function CommercialModulePage() {
  return (
    <ModulePage
      title="Comercial"
      description="Orçamentos, vendas e frente de caixa"
      icon={ShoppingBag}
      tabs={[
        { key: "quotes", label: "Orçamentos", icon: Calculator, content: <QuotesListPage /> },
        { key: "sales", label: "Vendas", icon: ShoppingBag, content: <SalesListPage /> },
        // PDV opens in its own full-screen page
      ]}
    />
  );
}
