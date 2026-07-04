/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */
import {
  LayoutDashboard, UserRound, ClipboardList, Package, ShoppingBag,
  DollarSign, Percent, MessageSquare, Settings, MonitorSmartphone,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTE_ROLES, type AppRole } from "@/lib/permissions";
import logoI9 from "@/assets/logo-i9.png";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
};

const navItems: NavItem[] = [
  { title: "Dashboard",      url: "/dashboard",       icon: LayoutDashboard,   roles: ROUTE_ROLES.dashboard },
  { title: "Operação",       url: "/operation",       icon: ClipboardList,     roles: ROUTE_ROLES.operation },
  { title: "Cadastros",      url: "/registrations",   icon: UserRound,         roles: ROUTE_ROLES.registrations },
  { title: "Estoque",        url: "/stock",           icon: Package,           roles: ROUTE_ROLES.stock },
  { title: "Comercial",      url: "/commercial",      icon: ShoppingBag,       roles: ROUTE_ROLES.commercial },
  { title: "Financeiro",     url: "/financial",       icon: DollarSign,        roles: ROUTE_ROLES.financial },
  { title: "Comissões",      url: "/commissions-hub", icon: Percent,           roles: ROUTE_ROLES.commissionsHub },
  { title: "Comunicação",    url: "/communication",   icon: MessageSquare,     roles: ROUTE_ROLES.communication },
  { title: "Administração",  url: "/admin-hub",       icon: Settings,          roles: ROUTE_ROLES.adminHub },
];

const pdvItem: NavItem = {
  title: "Frente de Caixa",
  url: "/pdv",
  icon: MonitorSmartphone,
  roles: ROUTE_ROLES.pdv,
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { roles, loading } = useAuth();

  const canAccess = (allowed: AppRole[]) =>
    !loading &&
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.some((r) => allowed.includes(r as AppRole));

  const visibleNav = navItems.filter((i) => canAccess(i.roles));
  const showPdv = canAccess(pdvItem.roles);

  const isActive = (url: string) =>
    url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logoI9} alt="i9" className="h-8 w-8 object-contain" />
          {!collapsed && <span className="text-lg font-bold text-sidebar-foreground">i9 Solution</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="h-9">
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/60 rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {showPdv && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(pdvItem.url)} className="h-9">
                    <NavLink
                      to={pdvItem.url}
                      className="hover:bg-sidebar-accent/60 rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    >
                      <pdvItem.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{pdvItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
