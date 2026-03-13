/**
 * Sistema de gestão técnica i9
 * Desenvolvido por Alvo Sistemas e Gestão
 */
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { AppBreadcrumb } from "./AppBreadcrumb";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <AppBreadcrumb />
          <main className="flex-1 p-6">{children}</main>
          <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
            © i9 — Todos os direitos reservados · Sistema desenvolvido por Alvo Sistemas e Gestão
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
