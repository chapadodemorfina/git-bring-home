import { useEffect, useRef, useState } from "react";
import { Download, Loader2, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { exportAdminBackup } from "@/lib/admin-backup";

type BackupResult = Awaited<ReturnType<typeof exportAdminBackup>>;

export default function AdminBackupPage() {
  const { user, hasRole } = useAuth();
  const { activeTenant } = useTenant();
  const isAdmin = hasRole("admin");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ message: "", completed: 0, total: 1 });
  const [error, setError] = useState("");
  const [result, setResult] = useState<BackupResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Changing company, signing out or leaving this tab discards sensitive results.
  useEffect(() => {
    setAcknowledged(false);
    setBusy(false);
    setResult(null);
    setError("");
    setProgress({ message: "", completed: 0, total: 1 });
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [activeTenant?.id, user?.id, isAdmin]);

  useEffect(() => {
    if (!result) {
      setDownloadUrl(null);
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  const start = async () => {
    if (!user || !activeTenant || !isAdmin || !acknowledged || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    setProgress({ message: "Verificando seu acesso…", completed: 0, total: 1 });
    try {
      const { exportAdminBackup } = await import("@/lib/admin-backup");
      const backup = await exportAdminBackup({
        tenantId: activeTenant.id,
        userId: user.id,
        signal: controller.signal,
        onProgress: (next) => {
          if (controllerRef.current === controller && !controller.signal.aborted) setProgress(next);
        },
      });
      if (controllerRef.current === controller && !controller.signal.aborted) setResult(backup);
    } catch {
      if (controllerRef.current === controller) {
        setError(controller.signal.aborted
          ? "Exportação cancelada. Nenhum dado foi alterado."
          : "Não foi possível concluir a exportação. Confira sua conexão e o acesso de administrador à empresa e tente novamente.");
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
      }
    }
  };

  if (!isAdmin) return <p role="alert">O backup está disponível apenas para administradores.</p>;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Backup da empresa</CardTitle>
        <CardDescription>
          Exporte os dados de {activeTenant?.name || "sua empresa"} para guardar uma cópia no seu computador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>O arquivo ZIP reúne os registros que sua conta pode consultar e os anexos vinculados que puderem ser baixados. A exportação não grava arquivos no banco antigo.</p>
          <p>Esta é uma cópia dos dados da empresa acessíveis pelo sistema. Os campos conhecidos de senhas e chaves são excluídos ou ocultados. A estrutura interna do banco fica de fora. O relatório dentro do ZIP identifica o conteúdo e qualquer falha.</p>
          <p>Faça a exportação em um período sem alterações no sistema e mantenha esta aba aberta. Guarde o arquivo em local privado: ele contém dados de clientes e da empresa.</p>
        </div>

        <label className="flex items-start gap-3 rounded-md border p-3 text-sm" htmlFor="backup-scope">
          <Checkbox id="backup-scope" checked={acknowledged} disabled={busy}
            onCheckedChange={(value) => setAcknowledged(value === true)} className="mt-0.5" />
          <span>Entendi o conteúdo da cópia e vou evitar alterações durante a exportação.</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button onClick={start} disabled={busy || !acknowledged || !activeTenant || !user}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {busy ? "Preparando cópia…" : "Preparar backup"}
          </Button>
          {busy && <Button variant="outline" onClick={() => controllerRef.current?.abort()}>
            <X className="mr-2 h-4 w-4" />Cancelar
          </Button>}
        </div>

        {busy && <div className="space-y-2" role="status" aria-live="polite">
          <p className="text-sm">{progress.message}</p>
          <Progress aria-label="Progresso da exportação"
            value={Math.min(100, Math.max(0, progress.completed / Math.max(1, progress.total) * 100))} />
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {result && <div className="rounded-md border p-4 space-y-3" role="status">
          <p className="font-medium">
            {result.manifest.status === "partial" ? "Cópia parcial — confira as pendências" : "Cópia do escopo disponível preparada"}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.manifest.rowCount.toLocaleString("pt-BR")} registros em {result.manifest.tableCount} tabelas.
            {" "}O arquivo ainda precisa ser baixado e conferido antes da migração.
          </p>
          {result.manifest.issues.length > 0 && <details className="text-sm">
            <summary className="cursor-pointer">Ver pendências ({result.manifest.issues.length})</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {result.manifest.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>
          </details>}
          {downloadUrl && <Button asChild><a href={downloadUrl} download={result.filename}>
            <Download className="mr-2 h-4 w-4" />Baixar arquivo ZIP
          </a></Button>}
        </div>}
      </CardContent>
    </Card>
  );
}
