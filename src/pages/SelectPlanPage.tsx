import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Crown, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoI9 from "@/assets/logo-i9.png";

export default function SelectPlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
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

  const handleSelectPlan = async () => {
    if (!activeTenant) return;

    const plan = plans[0];
    if (!plan) return;

    setSelecting(plan.id);
    try {
      const { error } = await (supabase as any)
        .from("subscriptions")
        .update({
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date("2099-12-31").toISOString(),
        })
        .eq("tenant_id", activeTenant.id);

      if (error) throw error;
      toast({ title: "Plano ativado!", description: "Seu acesso vitalício foi ativado com sucesso." });
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

  const features = [
    "Usuários ilimitados",
    "Ordens de serviço ilimitadas",
    "Produtos ilimitados",
    "WhatsApp integrado",
    "Portal do cliente",
    "Orçamentos e garantias",
    "Pontos de coleta e comissões",
    "Logística e financeiro completo",
    "Relatórios avançados",
    "API completa",
    "Suporte prioritário",
    "Atualizações vitalícias",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/60 flex items-center justify-center py-16 px-4">
      <div className="max-w-lg w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <img src={logoI9} alt="i9 Solution" className="h-11 w-auto mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Acesso Vitalício
          </h1>
          <p className="text-muted-foreground/80 mt-3 max-w-md mx-auto text-sm md:text-base">
            Pague uma vez e tenha acesso completo ao sistema para sempre, com todas as atualizações inclusas.
          </p>
        </div>

        {/* Card */}
        <Card className="relative border-primary shadow-xl ring-2 ring-primary/30">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 px-3 py-1 text-xs font-semibold shadow-sm">
            <Crown className="h-3 w-3" /> Acesso completo
          </Badge>

          <CardHeader className="text-center pb-2 pt-10">
            <CardTitle className="text-base font-bold tracking-wide text-muted-foreground">
              Plano Vitalício
            </CardTitle>
            <CardDescription className="mt-4 mb-1 space-y-1">
              <div>
                <span className="text-4xl font-extrabold text-foreground">R$ 3.500</span>
                <span className="text-muted-foreground text-sm font-medium"> à vista</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ou <span className="font-semibold text-foreground">10x de R$ 350,00</span>
              </div>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <ul className="space-y-2.5 mb-8">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={handleSelectPlan}
              disabled={!!selecting}
              size="lg"
              className="w-full font-semibold shadow-md"
            >
              {selecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ativar agora
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Dúvidas sobre o plano?{" "}
            <a
              href="https://wa.me/5500000000000?text=Olá! Gostaria de saber mais sobre o plano vitalício."
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Fale conosco
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}