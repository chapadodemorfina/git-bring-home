import { ShoppingBag, Calculator } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import QuotesListPage from "@/modules/quotes/pages/QuotesListPage";
import SalesListPage from "@/modules/sales/pages/SalesListPage";
import { usePermissionMap } from "@/modules/permissions/hooks/usePermissions";

export default function CommercialModulePage() {
  const { hasPermission, isLoading } = usePermissionMap();

  const canQuotes = hasPermission("quotes.view");
  const canSales = hasPermission("sales.view");

  const tabs = [
    canQuotes && {
      key: "quotes",
      label: "Orçamentos",
      icon: Calculator,
      content: <QuotesListPage />,
    },
    canSales && {
      key: "sales",
      label: "Vendas",
      icon: ShoppingBag,
      content: <SalesListPage />,
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    icon: typeof Calculator;
    content: JSX.Element;
  }>;

  if (!isLoading && tabs.length === 0) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Módulo Comercial</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você tem acesso ao módulo Comercial, mas não possui permissão para
            visualizar orçamentos ou vendas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ModulePage
      title="Comercial"
      description="Orçamentos, vendas e frente de caixa"
      icon={ShoppingBag}
      tabs={tabs}
    />
  );
}
