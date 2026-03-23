import { useState } from "react";
import { useDiagnostic, useQuotes, useCreateQuote, useCreateQuoteFromDiagnosis } from "../hooks/useDiagnostics";
import DiagnosisForm from "./DiagnosisForm";
import QuoteBuilder from "./QuoteBuilder";
import ApprovalControls from "./ApprovalControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Stethoscope, FileText, Plus, Zap } from "lucide-react";

interface Props {
  serviceOrderId: string;
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  reportedIssue?: string | null;
}

export default function DiagnosticQuotePanel({ serviceOrderId, deviceType, deviceBrand, deviceModel, reportedIssue }: Props) {
  const { data: diagnostic, isLoading: diagLoading } = useDiagnostic(serviceOrderId);
  const { data: quotes, isLoading: quotesLoading } = useQuotes(serviceOrderId);
  const createQuote = useCreateQuote();
  const createFromDiag = useCreateQuoteFromDiagnosis();
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [genQuoteOpen, setGenQuoteOpen] = useState(false);
  const [analysisFee, setAnalysisFee] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [laborRate, setLaborRate] = useState("80");
  const [laborHours, setLaborHours] = useState(String(diagnostic?.estimated_repair_hours || "1"));

  const handleCreateQuote = async () => {
    await createQuote.mutateAsync({
      serviceOrderId,
      analysisFee: analysisFee ? parseFloat(analysisFee) : undefined,
      expiresAt: expiresAt || undefined,
    });
    setNewQuoteOpen(false);
    setAnalysisFee("");
    setExpiresAt("");
  };

  const handleGenerateFromDiag = async () => {
    if (!diagnostic?.id) return;
    await createFromDiag.mutateAsync({
      serviceOrderId,
      diagnosisId: diagnostic.id,
      laborHours: parseFloat(laborHours) || 0,
      laborRate: parseFloat(laborRate) || 0,
    });
    setGenQuoteOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Diagnosis Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4" /> Diagnóstico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diagLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <DiagnosisForm serviceOrderId={serviceOrderId} existing={diagnostic} deviceType={deviceType} deviceBrand={deviceBrand} deviceModel={deviceModel} reportedIssue={reportedIssue} />
          )}
        </CardContent>
      </Card>

      {/* Quotes Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Orçamentos
              {quotes && quotes.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs rounded-full px-1.5">{quotes.length}</span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {diagnostic?.id && diagnostic.diagnosis_status === "completed" && (
                <Button size="sm" variant="outline" onClick={() => {
                  setLaborHours(String(diagnostic.estimated_repair_hours || 1));
                  setGenQuoteOpen(true);
                }}>
                  <Zap className="mr-1 h-4 w-4" /> Gerar do Diagnóstico
                </Button>
              )}
              <Button size="sm" onClick={() => setNewQuoteOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Novo Orçamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !quotes?.length ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum orçamento criado para esta OS.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((q) => (
                <div key={q.id} className="space-y-4">
                  <QuoteBuilder quote={q} />
                  <ApprovalControls quote={q} serviceOrderId={serviceOrderId} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Quote Dialog */}
      <Dialog open={newQuoteOpen} onOpenChange={setNewQuoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Taxa de Análise (R$)</Label>
              <Input type="number" step="0.01" min="0" value={analysisFee}
                onChange={(e) => setAnalysisFee(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Validade do Orçamento</Label>
              <Input type="datetime-local" value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewQuoteOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateQuote} disabled={createQuote.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate from Diagnosis Dialog */}
      <Dialog open={genQuoteOpen} onOpenChange={setGenQuoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar Orçamento do Diagnóstico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As peças do diagnóstico serão incluídas automaticamente.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horas de Mão de Obra</Label>
                <Input type="number" step="0.5" min="0" value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)} />
              </div>
              <div>
                <Label>Valor/Hora (R$)</Label>
                <Input type="number" step="1" min="0" value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenQuoteOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerateFromDiag} disabled={createFromDiag.isPending}>
              <Zap className="mr-2 h-4 w-4" /> Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
