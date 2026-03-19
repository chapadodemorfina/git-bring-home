import { ReactNode } from "react";

interface SubscriptionGateProps {
  children: ReactNode;
}

/**
 * Subscription gate temporarily disabled for i9 Solution.
 * To re-enable, restore the subscription/plan checks.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  return <>{children}</>;
}
