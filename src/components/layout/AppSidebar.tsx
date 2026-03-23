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
import logoI9 from "@/assets/logo-i9.png";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Operação", url: "/operation", icon: ClipboardList },
  { title: "Cadastros", url: "/registrations", icon: UserRound },
  { title: "Estoque", url: "/stock", icon: Package },
  { title: "Comercial", url: "/commercial", icon: ShoppingBag },
  { title: "Financeiro", url: "/financial", icon: DollarSign },
  { title: "Comissões", url: "/commissions-hub", icon: Percent },
  { title: "Comunicação", url: "/communication", icon: MessageSquare },
  { title: "Administração", url: "/admin-hub", icon: Settings },
];

const pdvItem = { title: "Frente de Caixa", url: "/pdv", icon: MonitorSmartphone };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole } = useAuth();
  const showPdv = hasRole("admin") || hasRole("manager") || hasRole("front_desk");

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
              {navItems.map((item) => (
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
