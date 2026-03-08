import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ClipboardList, FileText, Shield, Truck, LogOut, Home, MessageCircle, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2 } from "lucide-react";

const navItems = [
  { label: "Início", path: "/portal", icon: LayoutDashboard, exact: true },
  { label: "Minhas OS", path: "/portal/orders", icon: ClipboardList },
  { label: "Orçamentos", path: "/portal/quotes", icon: FileText },
  { label: "Garantias", path: "/portal/warranties", icon: Shield },
  { label: "Logística", path: "/portal/logistics", icon: Truck },
  { label: "Suporte", path: "/portal/support", icon: MessageCircle },
];

export default function PortalLayout() {
  const { session, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/portal/login" replace />;
  }

  const isActive = (path: string, exact?: boolean) =>
    exact
      ? location.pathname === path
      : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/portal" className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Portal do Cliente</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">Portal do Cliente</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile-friendly Nav */}
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide -mx-1 px-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path, item.exact) ? "default" : "ghost"}
                  size="sm"
                  className="whitespace-nowrap text-xs sm:text-sm"
                >
                  <item.icon className="h-4 w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.label.split(" ")[0]}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Outlet />
      </main>
    </div>
  );
}
