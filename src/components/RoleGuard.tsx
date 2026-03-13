import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "manager" | "front_desk" | "bench_technician" | "field_technician" | "finance" | "collection_point_operator" | "customer";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = "/dashboard" }: RoleGuardProps) {
  const { roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAccess = roles.some((r) => allowedRoles.includes(r as AppRole));

  if (!hasAccess) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
