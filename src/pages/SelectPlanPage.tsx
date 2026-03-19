import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoI9 from "@/assets/logo-i9.png";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_users: number;
  max_service_orders: number;
  max_products: number;
  features: string[];
}

const FEATURE_LABELS: Record<string, string[]> = {
  starter: ["Até 2 usuários", "50 ordens/mês", "100 produtos", "Suporte por email"],
  professional: ["Até 10 usuários", "500 ordens/mês", "1.000 produtos", "WhatsApp integrado", "Portal do cliente", "Suporte prioritário"],
  business: ["Até 50 usuários", "Ordens ilimitadas", "Produtos ilimitados", "Pontos de coleta", "Relatórios avançados", "API completa", "Suporte dedicado"],
  enterprise: ["Usuários ilimitados", "Tudo ilimitado", "Multi-tenant", "SLA garantido", "Onboarding dedicado", "Suporte 24/7"],
};

export default function SelectPlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const { activeTenant } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await (supabase as any)
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });
      setPlans(data || []);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleSelectPlan = async (plan: Plan) => {
    if (!activeTenant) return;
    setSelecting(plan.id);

    try {
      // Update the subscription to the selected plan
      const { error } = await (supabase as any)
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("tenant_id", activeTenant.id);

      if (error) throw error;

      toast({ title: "Plano ativado!", description: `Você agora está no plano ${plan.name}.` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <img src={logoI9} alt="i9 Solution" className="h-12 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Escolha seu plano</h1>
          <p className="text-muted-foreground mt-2">
            Seu período de teste expirou. Selecione um plano para continuar usando o sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const features = FEATURE_LABELS[plan.slug] || [];
            const isPopular = plan.slug === "professional";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  isPopular ? "border-primary shadow-lg ring-2 ring-primary/20" : ""
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                    <Sparkles className="h-3 w-3" /> Mais popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price_monthly === 0
                        ? "Grátis"
                        : `R$ ${plan.price_monthly.toFixed(0)}`}
                    </span>
                    {plan.price_monthly > 0 && (
                      <span className="text-muted-foreground text-sm">/mês</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={!!selecting}
                    variant={isPopular ? "default" : "outline"}
                    className="w-full"
                  >
                    {selecting === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {plan.slug === "enterprise" ? "Falar com vendas" : "Selecionar"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
