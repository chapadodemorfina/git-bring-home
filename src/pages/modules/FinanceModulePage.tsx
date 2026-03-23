import { DollarSign, TrendingUp, Landmark } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import FinanceListPage from "@/modules/finance/pages/FinanceListPage";
import ReceivablesPage from "@/modules/receivables/pages/ReceivablesPage";
import CashRegisterPage from "@/modules/cash-register/pages/CashRegisterPage";

export default function FinanceModulePage() {
  return (
    <ModulePage
      title="Financeiro"
      description="Lançamentos, contas a receber e controle de caixa"
      icon={DollarSign}
      tabs={[
        { key: "entries", label: "Financeiro", icon: DollarSign, content: <FinanceListPage /> },
        { key: "receivables", label: "Contas a Receber", icon: TrendingUp, content: <ReceivablesPage /> },
        { key: "cash-register", label: "Controle de Caixa", icon: Landmark, content: <CashRegisterPage /> },
      ]}
    />
  );
}
