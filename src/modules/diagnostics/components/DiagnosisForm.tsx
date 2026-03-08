import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DiagnosticFormData, diagnosticSchema, complexityLabels, Diagnostic,
  viabilityLabels, diagnosisStatusLabels, testTemplates,
} from "../types";
import { useSaveDiagnostic, useCompleteDiagnosis, useDiagnosisTests, useAddDiagnosisTest } from "../hooks/useDiagnostics";
import DiagnosisTestsPanel from "./DiagnosisTestsPanel";
import DiagnosisFaultsPanel from "./DiagnosisFaultsPanel";
import DiagnosisPartsPanel from "./DiagnosisPartsPanel";
import DiagnosticSuggestionsPanel from "./DiagnosticSuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Save, Stethoscope, CheckCircle2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  serviceOrderId: string;
  existing?: Diagnostic | null;
  deviceType?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  reportedIssue?: string | null;
}

export default function DiagnosisForm({ serviceOrderId, existing, deviceType, deviceBrand, deviceModel, reportedIssue }: Props) {
  const saveMutation = useSaveDiagnostic();
  const completeMutation = useCompleteDiagnosis();
  const addTest = useAddDiagnosisTest();
  const { data: existingTests } = useDiagnosisTests(existing?.id);
  const { toast } = useToast();

  const form = useForm<DiagnosticFormData>({
    resolver: zodResolver(diagnosticSchema),
    defaultValues: {
      technical_findings: existing?.technical_findings || "",
      probable_cause: existing?.probable_cause || "",
      required_parts: existing?.required_parts || "",
      repair_complexity: existing?.repair_complexity || "moderate",
      estimated_repair_hours: existing?.estimated_repair_hours ?? undefined,
      internal_notes: existing?.internal_notes || "",
      repair_viability: existing?.repair_viability || undefined,
      not_repairable_reason: existing?.not_repairable_reason || "",
    },
  });

  const viability = form.watch("repair_viability");

  const onSubmit = async (data: DiagnosticFormData) => {
    await saveMutation.mutateAsync({ id: existing?.id, serviceOrderId, data });
  };

  const handleLoadTemplates = async () => {
    if (!existing?.id) {
      toast({ title: "Salve o diagnóstico primeiro", variant: "destructive" });
      return;
    }
    const type = deviceType || "other";
    const templates = testTemplates[type] || testTemplates.other;
    const existingNames = new Set((existingTests || []).map(t => t.test_name));

    let added = 0;
    for (let i = 0; i < templates.length; i++) {
      if (!existingNames.has(templates[i].name)) {
        await addTest.mutateAsync({
          diagnosisId: existing.id,
          testName: templates[i].name,
          testCategory: templates[i].category,
          sortOrder: i,
        });
        added++;
      }
    }
    toast({ title: added > 0 ? `${added} testes adicionados!` : "Todos os testes já existem" });
  };

  const handleComplete = async () => {
    if (!existing?.id) return;
    await completeMutation.mutateAsync({ id: existing.id, serviceOrderId });
  };

  const isCompleted = existing?.diagnosis_status === "completed";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" /> Diagnóstico Técnico
            </CardTitle>
            {existing && (
              <Badge variant="outline">
                {diagnosisStatusLabels[existing.diagnosis_status]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="technical_findings" render={({ field }) => (
                <FormItem>
                  <FormLabel>Achados Técnicos</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Descreva os achados da análise técnica..." {...field} disabled={isCompleted} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="probable_cause" render={({ field }) => (
                <FormItem>
                  <FormLabel>Causa Provável</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Causa raiz identificada..." {...field} disabled={isCompleted} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="repair_complexity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complexidade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isCompleted}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(complexityLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="estimated_repair_hours" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Estimado (h)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" min="0" placeholder="Ex: 2.5" {...field} value={field.value ?? ""} disabled={isCompleted} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="repair_viability" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Viabilidade</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange} disabled={isCompleted}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(viabilityLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {viability === "not_repairable" && (
                <FormField control={form.control} name="not_repairable_reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo — Não Reparável</FormLabel>
                    <FormControl><Textarea rows={2} placeholder="Ex: placa-mãe com dano irreversível..." {...field} disabled={isCompleted} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="internal_notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Internas</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Observações internas..." {...field} disabled={isCompleted} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {!isCompleted && (
                <div className="flex gap-2">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" /> {existing ? "Atualizar" : "Salvar Diagnóstico"}
                  </Button>
                  {existing && (
                    <Button type="button" variant="outline" onClick={handleComplete} disabled={completeMutation.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir Diagnóstico
                    </Button>
                  )}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Structured sections - only after diagnosis is saved */}
      {existing?.id && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Testes Realizados</CardTitle>
                {!isCompleted && (
                  <Button variant="outline" size="sm" onClick={handleLoadTemplates} disabled={addTest.isPending}>
                    <Zap className="mr-1 h-3 w-3" /> Carregar Template
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DiagnosisTestsPanel diagnosisId={existing.id} readOnly={isCompleted} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Defeitos Identificados</CardTitle></CardHeader>
            <CardContent>
              <DiagnosisFaultsPanel diagnosisId={existing.id} readOnly={isCompleted} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Peças Necessárias</CardTitle></CardHeader>
            <CardContent>
              <DiagnosisPartsPanel diagnosisId={existing.id} readOnly={isCompleted} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
