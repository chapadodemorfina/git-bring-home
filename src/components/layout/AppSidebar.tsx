import {
  LayoutDashboard, Users, Shield, Settings, FileText, UserRound, Monitor, ClipboardList, Package, MapPin,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/customers", icon: UserRound },
  { title: "Dispositivos", url: "/devices", icon: Monitor },
  { title: "Ordens de Serviço", url: "/service-orders", icon: ClipboardList },
  { title: "Estoque & Peças", url: "/inventory", icon: Package },
  { title: "Pontos de Coleta", url: "/collection-points", icon: MapPin },
  { title: "Usuários", url: "/users", icon: Users },
  { title: "Perfis de Acesso", url: "/roles", icon: Shield },
];

const systemItems = [
  { title: "Configurações", url: "/settings", icon: Settings },
  { title: "Logs de Auditoria", url: "/audit-logs", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (url: string) =>
    location.pathname === url || location.pathname.startsWith(url + "/");

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink to={item.url} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        {!collapsed ? (
          <span className="text-lg font-bold text-sidebar-foreground">i9 Solution</span>
        ) : (
          <span className="text-lg font-bold text-sidebar-foreground">i9</span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(systemItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
