import { Settings, CreditCard, ShieldCheck, FileText, SearchCheck, KeyRound } from "lucide-react";
import ModulePage from "@/components/layout/ModulePage";
import SettingsPage from "@/pages/SettingsPage";
import SubscriptionPage from "@/modules/billing/pages/SubscriptionPage";
import AdminSubscriptionPage from "@/modules/billing/pages/AdminSubscriptionPage";
import AuditLogsPage from "@/pages/AuditLogsPage";
import FinancialAuditPage from "@/modules/finance/pages/FinancialAuditPage";
import PermissionsManagementPage from "@/modules/permissions/pages/PermissionsManagementPage";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminModulePage() {
  const { hasRole } = useAuth();
  const isAdminOrManager = hasRole("admin") || hasRole("manager");

  const tabs = [
    { key: "settings", label: "Configurações", icon: Settings, content: <SettingsPage /> },
    { key: "subscription", label: "Assinatura", icon: CreditCard, content: <SubscriptionPage /> },
    ...(isAdminOrManager
      ? [{ key: "admin-sub", label: "Admin Assinatura", icon: ShieldCheck, content: <AdminSubscriptionPage /> }]
      : []),
    ...(isAdminOrManager
      ? [{ key: "permissions", label: "Permissões", icon: KeyRound, content: <PermissionsManagementPage /> }]
      : []),
    { key: "audit-logs", label: "Logs de Auditoria", icon: FileText, content: <AuditLogsPage /> },
    ...(isAdminOrManager
      ? [{ key: "financial-audit", label: "Auditoria OS×Fin", icon: SearchCheck, content: <FinancialAuditPage /> }]
      : []),
  ];

  return (
    <ModulePage
      title="Administração"
      description="Configurações, assinatura e auditoria"
      icon={Settings}
      tabs={tabs}
    />
  );
}
