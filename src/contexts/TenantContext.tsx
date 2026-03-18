import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase, setActiveTenantId } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TenantRole = "owner" | "admin" | "member";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  logo_url: string | null;
  is_active: boolean;
}

export interface TenantMembership {
  tenant_id: string;
  tenant_role: TenantRole;
  is_default: boolean;
  tenant: Tenant;
}

interface TenantContextType {
  tenants: TenantMembership[];
  activeTenant: Tenant | null;
  activeTenantRole: TenantRole | null;
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = "i9_active_tenant_id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [activeTenantRole, setActiveTenantRole] = useState<TenantRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenants = useCallback(async () => {
    if (!user) {
      setTenants([]);
      setActiveTenant(null);
      setActiveTenantRole(null);
      setActiveTenantId(null);
      setLoading(false);
      return;
    }

    const db = supabase as any;
    const { data, error } = await db
      .from("tenant_users")
      .select("tenant_id, tenant_role, is_default, tenants(id, name, slug, document, logo_url, is_active)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching tenants:", error);
      setLoading(false);
      return;
    }

    const memberships: TenantMembership[] = (data || []).map((row: any) => ({
      tenant_id: row.tenant_id,
      tenant_role: row.tenant_role as TenantRole,
      is_default: row.is_default,
      tenant: row.tenants as Tenant,
    }));

    setTenants(memberships);

    // Determine active tenant: localStorage > default > first
    const storedId = localStorage.getItem(STORAGE_KEY);
    const stored = memberships.find((m) => m.tenant_id === storedId);
    const defaultM = memberships.find((m) => m.is_default);
    const active = stored || defaultM || memberships[0] || null;

    if (active) {
      setActiveTenant(active.tenant);
      setActiveTenantRole(active.tenant_role);
      setActiveTenantId(active.tenant_id);
      localStorage.setItem(STORAGE_KEY, active.tenant_id);
    } else {
      setActiveTenant(null);
      setActiveTenantRole(null);
      setActiveTenantId(null);
      localStorage.removeItem(STORAGE_KEY);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const switchTenant = useCallback(async (tenantId: string) => {
    const membership = tenants.find((m) => m.tenant_id === tenantId);
    if (!membership) return;

    // Persist in DB
    await supabase.rpc("switch_tenant" as any, { _tenant_id: tenantId });

    // Update local state
    setActiveTenant(membership.tenant);
    setActiveTenantRole(membership.tenant_role);
    setActiveTenantId(tenantId);
    localStorage.setItem(STORAGE_KEY, tenantId);
  }, [tenants]);

  return (
    <TenantContext.Provider value={{
      tenants,
      activeTenant,
      activeTenantRole,
      loading,
      switchTenant,
      refreshTenants: fetchTenants,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
}
