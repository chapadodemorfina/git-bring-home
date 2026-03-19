import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useTenant } from "@/contexts/TenantContext";
import { Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: ReactNode;
}

/**
 * Redirects to /select-plan if the tenant's subscription has expired
 * (status is not 'active' or 'trialing').
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { activeTenant, loading: tenantLoading } = useTenant();
  const { data: usage, isLoading } = usePlanUsage();

  if (tenantLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeTenant) return null;

  // If has subscription data and status is neither active nor trialing → force plan selection
  if (usage && usage.has_subscription && usage.status !== "active" && usage.status !== "trialing") {
    return <Navigate to="/select-plan" replace />;
  }

  return <>{children}</>;
}
