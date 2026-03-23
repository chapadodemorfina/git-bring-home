import { DollarSign, TrendingUp, Landmark } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import FinanceListPage from "@/modules/finance/pages/FinanceListPage";
import ReceivablesPage from "@/modules/receivables/pages/ReceivablesPage";
import CashRegisterPage from "@/modules/cash-register/pages/CashRegisterPage";
import FinanceHubDashboard from "@/modules/finance/components/FinanceHubDashboard";
import { Separator } from "@/components/ui/separator";

export default function FinanceModulePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Financeiro
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Lançamentos, contas a receber e controle de caixa
        </p>
      </div>

      {/* Dashboard */}
      <FinanceHubDashboard />

      <Separator />

      {/* Existing Tabs */}
      <ModulePage
        title=""
        tabs={[
          { key: "entries", label: "Financeiro", icon: DollarSign, content: <FinanceListPage /> },
          { key: "receivables", label: "Contas a Receber", icon: TrendingUp, content: <ReceivablesPage /> },
          { key: "cash-register", label: "Controle de Caixa", icon: Landmark, content: <CashRegisterPage /> },
        ]}
      />
    </div>
  );
}
