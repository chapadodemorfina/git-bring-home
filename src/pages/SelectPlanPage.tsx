import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles, MessageSquare } from "lucide-react";
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

const DISPLAY_NAMES: Record<string, string> = {
  starter: "Essencial",
  professional: "Profissional",
  business: "Gestão",
  enterprise: "Enterprise",
};

const DISPLAY_PRICES: Record<string, string> = {
  starter: "R$ 49",
  professional: "R$ 99",
  business: "R$ 199",
  enterprise: "Sob consulta",
};

const FEATURE_LABELS: Record<string, string[]> = {
  starter: [
    "Até 2 usuários",
    "50 ordens de serviço/mês",
    "100 produtos cadastrados",
    "Gestão de clientes e dispositivos",
    "PDFs personalizados",
    "Suporte por email",
  ],
  professional: [
    "Até 5 usuários",
    "200 ordens de serviço/mês",
    "500 produtos cadastrados",
    "WhatsApp integrado",
    "Portal do cliente",
    "Orçamentos e garantias",
    "Suporte prioritário",
  ],
  business: [
    "Até 15 usuários",
    "1.000 ordens de serviço/mês",
    "2.000 produtos cadastrados",
    "Pontos de coleta e comissões",
    "Logística e financeiro completo",
    "Relatórios avançados",
    "API completa",
    "Suporte dedicado",
  ],
  enterprise: [
    "Usuários ilimitados",
    "Ordens e produtos ilimitados",
    "Multi-tenant avançado",
    "SLA garantido",
    "Onboarding personalizado",
    "Suporte 24/7 com gerente dedicado",
  ],
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

    if (plan.slug === "enterprise") {
      window.open("https://wa.me/5500000000000?text=Olá! Gostaria de saber mais sobre o plano Enterprise.", "_blank");
      return;
    }

    setSelecting(plan.id);
    try {
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
      toast({ title: "Plano ativado!", description: `Você agora está no plano ${DISPLAY_NAMES[plan.slug] || plan.name}.` });
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/60 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <img src={logoI9} alt="i9 Solution" className="h-11 w-auto mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Escolha o plano ideal para sua operação
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-base md:text-lg">
            Continue usando o sistema com suporte, controle e recursos na medida do seu negócio.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 items-start">
          {plans.map((plan) => {
            const features = FEATURE_LABELS[plan.slug] || [];
            const isPopular = plan.slug === "professional";
            const isEnterprise = plan.slug === "enterprise";
            const displayName = DISPLAY_NAMES[plan.slug] || plan.name;
            const displayPrice = DISPLAY_PRICES[plan.slug];

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-shadow duration-200 ${
                  isPopular
                    ? "border-primary shadow-xl ring-2 ring-primary/30 scale-[1.02] lg:scale-105 z-10"
                    : "hover:shadow-lg"
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 px-3 py-1 text-xs font-semibold shadow-sm">
                    <Sparkles className="h-3 w-3" /> Mais popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2 pt-7">
                  <CardTitle className="text-base font-bold uppercase tracking-wide text-muted-foreground">
                    {displayName}
                  </CardTitle>
                  <CardDescription className="mt-3">
                    {isEnterprise ? (
                      <span className="text-2xl font-bold text-foreground">Sob consulta</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-foreground">
                          {displayPrice}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">/mês</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-4">
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={!!selecting}
                    variant={isPopular ? "default" : "outline"}
                    size="lg"
                    className={`w-full font-semibold ${isPopular ? "shadow-md" : ""}`}
                  >
                    {selecting === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEnterprise ? "Solicitar proposta" : "Começar agora"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground">
            Precisa de um plano personalizado?{" "}
            <a
              href="https://wa.me/5500000000000?text=Olá! Gostaria de um plano personalizado."
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Fale com nosso time comercial
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
