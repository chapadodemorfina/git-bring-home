import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  /** Rota para o botão "Voltar". Default: `/dashboard`. */
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = "/dashboard" }: RoleGuardProps) {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Bloqueio padrão: sem roles carregados ou nenhum role permitido → nega.
  const hasAccess =
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.some((r) => allowedRoles.includes(r as AppRole));

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button onClick={() => navigate(fallback, { replace: true })}>
              Ir para o Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
