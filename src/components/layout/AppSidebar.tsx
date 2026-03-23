/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */
import {
  LayoutDashboard, Users, ShieldCheck, Settings, FileText, UserRound, Monitor,
  ClipboardList, Package, MapPin, Truck, DollarSign, ListChecks, Bell,
  MessageSquare, ScanLine, Recycle, ShoppingBag, MonitorSmartphone, Landmark,
  Percent, TrendingUp, Calculator, CreditCard, BarChart3, SearchCheck,
  ChevronRight, Wrench,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import logoI9 from "@/assets/logo-i9.png";

type NavItem = { title: string; url: string; icon: React.ElementType; adminOnly?: boolean };

type NavGroup = {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operação",
    icon: ClipboardList,
    items: [
      { title: "Ordens de Serviço", url: "/service-orders", icon: ClipboardList },
      { title: "Escanear OS", url: "/service-orders/scan", icon: ScanLine },
      { title: "Filas de Trabalho", url: "/queues", icon: ListChecks },
      { title: "Garantias", url: "/warranties", icon: ShieldCheck },
    ],
  },
  {
    label: "Cadastros",
    icon: UserRound,
    items: [
      { title: "Clientes", url: "/customers", icon: UserRound },
      { title: "Dispositivos", url: "/devices", icon: Monitor },
      { title: "Pontos de Coleta", url: "/collection-points", icon: MapPin },
      { title: "Gestão de Equipe", url: "/system/users", icon: Users, adminOnly: true },
    ],
  },
  {
    label: "Estoque",
    icon: Package,
    items: [
      { title: "Estoque & Peças", url: "/inventory", icon: Package },
      { title: "Sucata & Reaproveitamento", url: "/inventory/scrap", icon: Recycle },
      { title: "Logística", url: "/logistics", icon: Truck },
    ],
  },
  {
    label: "Comercial",
    icon: ShoppingBag,
    items: [
      { title: "Orçamentos", url: "/quotes", icon: Calculator },
      { title: "Vendas", url: "/sales", icon: ShoppingBag },
      { title: "Frente de Caixa", url: "/pdv", icon: MonitorSmartphone },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    items: [
      { title: "Financeiro", url: "/finance", icon: DollarSign },
      { title: "Contas a Receber", url: "/financial/receivables", icon: TrendingUp },
      { title: "Controle de Caixa", url: "/cash-register", icon: Landmark },
    ],
  },
  {
    label: "Comissões",
    icon: Percent,
    items: [
      { title: "Comissões Parceiros", url: "/collection-points/commissions", icon: DollarSign },
      { title: "Relatório Parceiros", url: "/collection-points/reports", icon: BarChart3 },
      { title: "Comissões Equipe", url: "/commissions", icon: Percent },
    ],
  },
  {
    label: "Comunicação",
    icon: MessageSquare,
    items: [
      { title: "WhatsApp", url: "/whatsapp", icon: MessageSquare },
      { title: "Mensagens Clientes", url: "/message-history", icon: MessageSquare },
      { title: "Notificações", url: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Administração",
    icon: Settings,
    items: [
      { title: "Assinatura", url: "/subscription", icon: CreditCard },
      { title: "Admin Assinatura", url: "/admin/subscription", icon: ShieldCheck, adminOnly: true },
      { title: "Configurações", url: "/settings", icon: Settings },
      { title: "Logs de Auditoria", url: "/audit-logs", icon: FileText },
      { title: "Auditoria OS×Financeiro", url: "/financial/audit", icon: SearchCheck },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole } = useAuth();

  const isAdminOrManager = hasRole("admin") || hasRole("manager");

  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  const groupHasActive = (items: NavItem[]) =>
    items.some((item) => isActive(item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logoI9} alt="i9" className="h-8 w-8 object-contain" />
          {!collapsed && <span className="text-lg font-bold text-sidebar-foreground">i9 Solution</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Dashboard — standalone */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                  <NavLink to="/dashboard" className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collapsible groups */}
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || isAdminOrManager
          );
          if (visibleItems.length === 0) return null;

          const active = groupHasActive(visibleItems);

          if (collapsed) {
            // When collapsed, show only the group icon — clicking first item
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={active}>
                        <NavLink
                          to={visibleItems[0].url}
                          className="hover:bg-muted/50"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <group.icon className="h-4 w-4" />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible key={group.label} defaultOpen={active} className="group/collapsible">
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer select-none hover:bg-muted/50 rounded-md transition-colors">
                    <group.icon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    {group.label}
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive(item.url)}>
                            <NavLink
                              to={item.url}
                              className="hover:bg-muted/50"
                              activeClassName="bg-muted text-primary font-medium"
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
