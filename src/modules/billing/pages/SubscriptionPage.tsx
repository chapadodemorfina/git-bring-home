import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import {
  CreditCard, Calendar, Users, ClipboardList, Package,
  AlertTriangle, CheckCircle2, Clock, MessageSquare,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  trialing: { label: "Período de teste", variant: "secondary" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  canceled: { label: "Cancelado", variant: "destructive" },
  unpaid: { label: "Não pago", variant: "destructive" },
  inactive: { label: "Inativo", variant: "outline" },
};

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

function UsageBar({ label, icon: Icon, current, limit }: { label: string; icon: any; current: number; limit: number }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isUnlimited = limit >= 999999;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </span>
        <span className="text-muted-foreground">
          {current} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      {!isUnlimited && <Progress value={pct} className="h-2" />}
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: sub, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = usePlanUsage();

  if (subLoading || usageLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const status = STATUS_MAP[sub?.status || "inactive"] || STATUS_MAP.inactive;
  const isTrialing = sub?.status === "trialing";
  const isExpired = sub?.status !== "active" && sub?.status !== "trialing";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">Gerencie seu plano e acompanhe o uso dos recursos</p>
      </div>

      {/* Status Alert */}
      {isExpired && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Assinatura expirada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Seu acesso ao sistema está bloqueado. Entre em contato com o suporte para reativar seu plano.
              </p>
              <Button variant="destructive" size="sm" className="mt-3" asChild>
                <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Falar com suporte
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isTrialing && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 pt-6">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Período de teste</p>
              <p className="text-sm text-muted-foreground mt-1">
                Seu período de teste termina em <strong>{fmt(sub?.trial_ends_at)}</strong>. 
                Após essa data, será necessário ativar um plano para continuar usando o sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Plano atual</CardTitle>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <CardDescription>Detalhes da sua assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <p className="text-lg font-semibold text-foreground">{sub?.plan?.name || "Nenhum"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor mensal</p>
              <p className="text-lg font-semibold text-foreground">
                {sub?.plan?.price_monthly
                  ? `R$ ${sub.plan.price_monthly.toFixed(2).replace(".", ",")}`
                  : "—"}
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Início do período:</span>
              <span className="font-medium text-foreground">{fmt(sub?.current_period_start)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fim do período:</span>
              <span className="font-medium text-foreground">{fmt(sub?.current_period_end)}</span>
            </div>
            {sub?.trial_ends_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Trial expira em:</span>
                <span className="font-medium text-foreground">{fmt(sub.trial_ends_at)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Provedor:</span>
              <span className="font-medium text-foreground capitalize">{sub?.billing_provider || "manual"}</span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled>
              <CreditCard className="mr-2 h-4 w-4" />
              Assinar plano (em breve)
            </Button>
            <Button variant="ghost" asChild>
              <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com comercial
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Uso de recursos
          </CardTitle>
          <CardDescription>Acompanhe o consumo dos limites do seu plano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {usage?.users && (
            <UsageBar label="Usuários" icon={Users} current={usage.users.current} limit={usage.users.limit} />
          )}
          {usage?.service_orders && (
            <UsageBar label="Ordens de Serviço (mês)" icon={ClipboardList} current={usage.service_orders.current} limit={usage.service_orders.limit} />
          )}
          {usage?.products && (
            <UsageBar label="Produtos" icon={Package} current={usage.products.current} limit={usage.products.limit} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
