import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CreditCard, MessageSquare, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoI9 from "@/assets/logo-i9.png";

const STATUS_MESSAGES: Record<string, { title: string; description: string }> = {
  past_due: {
    title: "Pagamento pendente",
    description: "Sua assinatura está com pagamento pendente. Regularize para continuar usando o sistema.",
  },
  canceled: {
    title: "Assinatura cancelada",
    description: "Sua assinatura foi cancelada. Reative seu plano para recuperar o acesso.",
  },
  unpaid: {
    title: "Assinatura não paga",
    description: "Existem pagamentos não realizados. Entre em contato para regularizar.",
  },
  inactive: {
    title: "Assinatura inativa",
    description: "Sua assinatura está inativa. Ative um plano para continuar.",
  },
};

interface Props {
  status: string;
  planName?: string;
}

export function SubscriptionExpiredScreen({ status, planName }: Props) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const msg = STATUS_MESSAGES[status] || STATUS_MESSAGES.inactive;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <img src={logoI9} alt="i9 Solution" className="h-10 w-auto mx-auto" />

          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{msg.title}</h2>
            <p className="text-sm text-muted-foreground">{msg.description}</p>
            {planName && (
              <p className="text-xs text-muted-foreground">
                Plano: <strong>{planName}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/select-plan")} className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Ver planos disponíveis
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar com suporte
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
