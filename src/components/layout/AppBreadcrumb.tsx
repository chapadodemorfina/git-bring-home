import { useLocation } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Clientes",
  devices: "Dispositivos",
  new: "Novo",
  edit: "Editar",
  users: "Usuários",
  roles: "Perfis de Acesso",
  settings: "Configurações",
  "audit-logs": "Logs de Auditoria",
};

export function AppBreadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb className="px-6 py-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Início</BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) => {
          const label = routeLabels[seg] || seg;
          const isLast = i === segments.length - 1;
          return (
            <BreadcrumbItem key={seg}>
              <BreadcrumbSeparator />
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={`/${segments.slice(0, i + 1).join("/")}`}>{label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
