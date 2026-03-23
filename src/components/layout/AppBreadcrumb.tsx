import { useLocation } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  operation: "Operação",
  registrations: "Cadastros",
  stock: "Estoque",
  commercial: "Comercial",
  financial: "Financeiro",
  "commissions-hub": "Comissões",
  communication: "Comunicação",
  "admin-hub": "Administração",
  customers: "Clientes",
  devices: "Dispositivos",
  "service-orders": "Ordens de Serviço",
  new: "Novo",
  edit: "Editar",
  users: "Usuários",
  settings: "Configurações",
  "audit-logs": "Logs de Auditoria",
  inventory: "Estoque",
  products: "Produtos",
  suppliers: "Fornecedores",
  movements: "Movimentações",
  "collection-points": "Pontos de Coleta",
  logistics: "Logística",
  finance: "Financeiro",
  quotes: "Orçamentos",
  sales: "Vendas",
  warranties: "Garantias",
  scrap: "Sucata",
  system: "Sistema",
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
