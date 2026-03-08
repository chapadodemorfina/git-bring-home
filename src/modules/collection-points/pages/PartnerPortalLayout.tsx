import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutDashboard, ClipboardList, DollarSign, LogOut, MapPin } from "lucide-react";
import { Loader2 } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/partner", icon: LayoutDashboard },
  { label: "Ordens de Serviço", path: "/partner/orders", icon: ClipboardList },
  { label: "Comissões", path: "/partner/commissions", icon: DollarSign },
];

export default function PartnerPortalLayout() {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/portal/login" replace />;

  const isActive = (path: string) =>
    path === "/partner" ? location.pathname === "/partner" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/partner" className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Portal do Parceiro</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Portal do Parceiro</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button variant={isActive(item.path) ? "default" : "ghost"} size="sm" className="whitespace-nowrap">
                  <item.icon className="h-4 w-4 mr-1.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
