import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, Mail, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

export default function PortalLoginPage() {
  const [authMode, setAuthMode] = useState<"email" | "otp">("otp");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpChannel, setOtpChannel] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/portal");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (otpChannel === "email") {
      const { error } = await supabase.auth.signInWithOtp({ email });
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao enviar código", description: error.message, variant: "destructive" });
      } else {
        setOtpSent(true);
        toast({ title: "Código enviado!", description: "Verifique seu email para o código de acesso." });
      }
    } else {
      const formattedPhone = phone.startsWith("+") ? phone : `+55${phone.replace(/\D/g, "")}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao enviar código", description: error.message, variant: "destructive" });
      } else {
        setOtpSent(true);
        toast({ title: "Código enviado!", description: "Verifique seu telefone para o código de acesso." });
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (otpChannel === "email") {
      result = await supabase.auth.verifyOtp({ email, token: otpCode, type: "email" });
    } else {
      const formattedPhone = phone.startsWith("+") ? phone : `+55${phone.replace(/\D/g, "")}`;
      result = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otpCode, type: "sms" });
    }

    setLoading(false);
    if (result.error) {
      toast({ title: "Código inválido", description: result.error.message, variant: "destructive" });
    } else {
      navigate("/portal");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Portal do Cliente</CardTitle>
          <CardDescription>Acompanhe seus serviços</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMode} onValueChange={(v) => { setAuthMode(v as any); setOtpSent(false); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="otp" className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Código de Acesso
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email e Senha
              </TabsTrigger>
            </TabsList>

            <TabsContent value="otp">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Tabs value={otpChannel} onValueChange={(v) => setOtpChannel(v as any)}>
                    <TabsList className="grid w-full grid-cols-2 mb-3">
                      <TabsTrigger value="email">Email</TabsTrigger>
                      <TabsTrigger value="phone">Telefone</TabsTrigger>
                    </TabsList>

                    <TabsContent value="email">
                      <div className="space-y-2">
                        <Label htmlFor="otp-email">Email</Label>
                        <Input
                          id="otp-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="phone">
                      <div className="space-y-2">
                        <Label htmlFor="otp-phone">Telefone (com DDD)</Label>
                        <Input
                          id="otp-phone"
                          type="tel"
                          placeholder="11999999999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Formato: DDD + número (ex: 11999999999)</p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Código de Acesso
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Enviamos um código para {otpChannel === "email" ? email : phone}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Código de Verificação</Label>
                    <Input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                      maxLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar e Entrar
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpSent(false)}>
                    Reenviar código
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Acesso exclusivo para clientes.
            <br />
            <Link to="/login" className="text-primary hover:underline">Acesso administrativo →</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Desenvolvido por Alvo Sistemas e Gestão
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
