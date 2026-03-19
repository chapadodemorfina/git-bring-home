import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldAlert } from "lucide-react";

const db = supabase as any;

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "trialing", label: "Trial" },
  { value: "past_due", label: "Pagamento pendente" },
  { value: "canceled", label: "Cancelado" },
  { value: "unpaid", label: "Não pago" },
  { value: "inactive", label: "Inativo" },
];

const PROVIDER_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "stripe", label: "Stripe" },
  { value: "asaas", label: "Asaas" },
];

interface Plan {
  id: string;
  name: string;
  slug: string;
}

export default function AdminSubscriptionPage() {
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ["plans-list"],
    queryFn: async () => {
      const { data, error } = await db.from("plans").select("id, name, slug").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["admin-subscription", activeTenant?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", activeTenant!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenant?.id,
  });

  const [form, setForm] = useState({
    plan_id: "",
    status: "trialing",
    billing_provider: "manual",
    billing_cycle: "monthly",
    current_period_start: "",
    current_period_end: "",
    trial_ends_at: "",
    external_customer_id: "",
    external_subscription_id: "",
  });

  useEffect(() => {
    if (subscription) {
      setForm({
        plan_id: subscription.plan_id || "",
        status: subscription.status || "trialing",
        billing_provider: subscription.billing_provider || "manual",
        billing_cycle: subscription.billing_cycle || "monthly",
        current_period_start: subscription.current_period_start?.slice(0, 16) || "",
        current_period_end: subscription.current_period_end?.slice(0, 16) || "",
        trial_ends_at: subscription.trial_ends_at?.slice(0, 16) || "",
        external_customer_id: subscription.external_customer_id || "",
        external_subscription_id: subscription.external_subscription_id || "",
      });
    }
  }, [subscription]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenant || !subscription) throw new Error("Sem assinatura");

      const oldData = { ...subscription };
      const updatePayload: Record<string, any> = {
        plan_id: form.plan_id,
        status: form.status,
        billing_provider: form.billing_provider,
        billing_cycle: form.billing_cycle,
        current_period_start: form.current_period_start ? new Date(form.current_period_start).toISOString() : null,
        current_period_end: form.current_period_end ? new Date(form.current_period_end).toISOString() : null,
        trial_ends_at: form.trial_ends_at ? new Date(form.trial_ends_at).toISOString() : null,
        external_customer_id: form.external_customer_id || null,
        external_subscription_id: form.external_subscription_id || null,
        updated_at: new Date().toISOString(),
      };

      if (form.status === "canceled") {
        updatePayload.canceled_at = new Date().toISOString();
      }

      const { error } = await db
        .from("subscriptions")
        .update(updatePayload)
        .eq("id", subscription.id);
      if (error) throw error;

      // Audit log
      await db.from("audit_logs").insert({
        tenant_id: activeTenant.id,
        user_id: user?.id,
        action: "subscription.manual_update",
        table_name: "subscriptions",
        record_id: subscription.id,
        old_data: oldData,
        new_data: updatePayload,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription"] });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["plan-usage"] });
      toast({ title: "Assinatura atualizada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" />
          Gerenciar Assinatura
        </h1>
        <p className="text-muted-foreground">
          Alteração manual da assinatura do tenant. Toda alteração é auditada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Assinatura</CardTitle>
          <CardDescription>
            Tenant: <strong>{activeTenant?.name}</strong> ({activeTenant?.id.slice(0, 8)}…)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Plan */}
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={form.plan_id} onValueChange={(v) => setForm((f) => ({ ...f, plan_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {plans?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing provider */}
            <div className="space-y-2">
              <Label>Provedor de Billing</Label>
              <Select value={form.billing_provider} onValueChange={(v) => setForm((f) => ({ ...f, billing_provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing cycle */}
            <div className="space-y-2">
              <Label>Ciclo</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => setForm((f) => ({ ...f, billing_cycle: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Início do período</Label>
              <Input type="datetime-local" value={form.current_period_start} onChange={(e) => setForm((f) => ({ ...f, current_period_start: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fim do período</Label>
              <Input type="datetime-local" value={form.current_period_end} onChange={(e) => setForm((f) => ({ ...f, current_period_end: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Trial expira em</Label>
              <Input type="datetime-local" value={form.trial_ends_at} onChange={(e) => setForm((f) => ({ ...f, trial_ends_at: e.target.value }))} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>External Customer ID</Label>
              <Input value={form.external_customer_id} onChange={(e) => setForm((f) => ({ ...f, external_customer_id: e.target.value }))} placeholder="cus_..." className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>External Subscription ID</Label>
              <Input value={form.external_subscription_id} onChange={(e) => setForm((f) => ({ ...f, external_subscription_id: e.target.value }))} placeholder="sub_..." className="font-mono text-sm" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
