import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useTenant } from "@/contexts/TenantContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";
import { SubscriptionExpiredScreen } from "@/modules/billing/components/SubscriptionExpiredScreen";

interface SubscriptionGateProps {
  children: ReactNode;
}

const ALLOWED_STATUSES = ["active", "trialing"];

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { activeTenant, loading: tenantLoading } = useTenant();
  const { data: sub, isLoading: subLoading } = useSubscription();
  const location = useLocation();

  if (tenantLoading || subLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeTenant) return null;

  // No subscription yet → redirect to plan selection
  if (!sub) {
    return <Navigate to="/select-plan" replace />;
  }

  // Blocked statuses → show friendly expired screen
  if (!ALLOWED_STATUSES.includes(sub.status)) {
    return <SubscriptionExpiredScreen status={sub.status} planName={sub.plan?.name} />;
  }

  return <>{children}</>;
}
