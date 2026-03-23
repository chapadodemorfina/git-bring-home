import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserRound, Monitor, MapPin, Users, Plus,
  Clock, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const db = supabase as any;

interface RegistrationCounts {
  customers: number;
  devices: number;
  collectionPoints: number;
  users: number;
  recentCustomers: { id: string; full_name: string; created_at: string }[];
  recentDevices: { id: string; brand: string | null; model: string | null; created_at: string; customer_name?: string }[];
}

function useRegistrationCounts() {
  return useQuery<RegistrationCounts>({
    queryKey: ["registration-hub-counts"],
    queryFn: async () => {
      const [customersRes, devicesRes, cpRes, usersRes, recentCustRes, recentDevRes] = await Promise.all([
        db.from("customers").select("id", { count: "exact", head: true }),
        db.from("devices").select("id", { count: "exact", head: true }),
        db.from("collection_points").select("id", { count: "exact", head: true }),
        db.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
        db.from("customers").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(5),
        db.from("devices").select("id, brand, model, created_at, customers!inner(full_name)").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        customers: customersRes.count ?? 0,
        devices: devicesRes.count ?? 0,
        collectionPoints: cpRes.count ?? 0,
        users: usersRes.count ?? 0,
        recentCustomers: recentCustRes.data ?? [],
        recentDevices: (recentDevRes.data ?? []).map((d: any) => ({
          id: d.id, brand: d.brand, model: d.model, created_at: d.created_at,
          customer_name: d.customers?.full_name,
        })),
      };
    },
    staleTime: 30_000,
  });
}

export default function RegistrationsHubDashboard() {
  const { data, isLoading } = useRegistrationCounts();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();

  const isAdminOrManager = hasRole("admin") || hasRole("manager");
  const d = data || { customers: 0, devices: 0, collectionPoints: 0, users: 0, recentCustomers: [], recentDevices: [] };

  const kpis = [
    { label: "Clientes", value: d.customers, icon: UserRound, color: "text-chart-1" },
    { label: "Dispositivos", value: d.devices, icon: Monitor, color: "text-chart-2" },
    ...(isAdminOrManager
      ? [
          { label: "Pontos de Coleta", value: d.collectionPoints, icon: MapPin, color: "text-chart-3" },
          { label: "Equipe Ativa", value: d.users, icon: Users, color: "text-chart-5" },
        ]
      : []),
  ];

  const goTab = (tab: string) => setParams({ tab }, { replace: true });

  const shortcuts = [
    { label: "Novo Cliente", icon: UserRound, onClick: () => navigate("/customers/new") },
    { label: "Novo Dispositivo", icon: Monitor, onClick: () => navigate("/devices/new") },
    ...(isAdminOrManager
      ? [
          { label: "Novo Ponto de Coleta", icon: MapPin, onClick: () => navigate("/collection-points/new") },
          { label: "Novo Membro", icon: Users, onClick: () => navigate("/system/users/new") },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className={`grid gap-3 grid-cols-2 ${isAdminOrManager ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-3 pb-2 px-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                    <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => (
          <Button key={s.label} variant="outline" size="sm" onClick={s.onClick} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {s.label}
          </Button>
        ))}
      </div>

      {/* Recent Records */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Últimos Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : d.recentCustomers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado.</p>
            ) : (
              <ul className="space-y-1">
                {d.recentCustomers.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                    >
                      <span className="truncate font-medium">{c.full_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {format(new Date(c.created_at), "dd/MM")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-2 gap-1 text-xs" onClick={() => goTab("customers")}>
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Últimos Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : d.recentDevices.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum dispositivo cadastrado.</p>
            ) : (
              <ul className="space-y-1">
                {d.recentDevices.map((dev) => (
                  <li key={dev.id}>
                    <button
                      onClick={() => navigate(`/devices/${dev.id}`)}
                      className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-medium">{[dev.brand, dev.model].filter(Boolean).join(" ") || "Sem modelo"}</span>
                        {dev.customer_name && (
                          <span className="text-muted-foreground ml-1.5 text-xs">— {dev.customer_name}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {format(new Date(dev.created_at), "dd/MM")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="w-full mt-2 gap-1 text-xs" onClick={() => goTab("devices")}>
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
