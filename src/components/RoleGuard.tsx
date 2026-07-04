import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDefaultRouteForRoles, type AppRole } from "@/lib/permissions";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  /** Rota para o botão "Ir para o Dashboard" na tela 403. */
  fallback?: string;
  /**
   * Quando true e o usuário possui alguma role válida (mas não a permitida),
   * redireciona silenciosamente para a home canônica do role
   * (`getDefaultRouteForRoles`) em vez de mostrar a tela 403.
   * Se o usuário não tiver nenhuma role, sempre mostra 403 (fail-closed).
   */
  redirectByRole?: boolean;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback = "/dashboard",
  redirectByRole = false,
}: RoleGuardProps) {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAnyRole = Array.isArray(roles) && roles.length > 0;
  const hasAccess =
    hasAnyRole && roles.some((r) => allowedRoles.includes(r as AppRole));

  if (!hasAccess) {
    // Redirect silencioso para a home do próprio role, se solicitado
    // e se o usuário realmente tem um role reconhecido.
    if (redirectByRole && hasAnyRole) {
      const target = getDefaultRouteForRoles(roles);
      if (target && target !== window.location.pathname) {
        return <Navigate to={target} replace />;
      }
    }

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
