import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Calculator, ShoppingCart, CreditCard, AlertCircle } from "lucide-react";

const db = supabase as any;

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  serviceOrderId: string;
  totalAmount: number;
  estimatedValue: number | null;
}

export default function ValuesComparisonPanel({ serviceOrderId, totalAmount, estimatedValue }: Props) {
  // Latest quote total
  const { data: quoteTotal } = useQuery({
    queryKey: ["so-quote-total", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_quotes")
        .select("total_amount")
        .eq("service_order_id", serviceOrderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.total_amount != null ? Number(data.total_amount) : null;
    },
  });

  // Financial entries summary
  const { data: financialData } = useQuery({
    queryKey: ["so-financial-summary", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("amount, status")
        .eq("service_order_id", serviceOrderId)
        .eq("entry_type", "revenue")
        .neq("status", "cancelled");
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const total = (data as any[]).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const paid = (data as any[]).filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount), 0);
      return { total, paid, pending: total - paid };
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo de Valores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OFFICIAL TOTAL — Primary block */}
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold tracking-wide uppercase text-primary">
              Total Oficial da OS
            </span>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-auto border-primary/30 text-primary">
              Oficial
            </Badge>
          </div>
          <p className="font-mono text-2xl font-bold text-primary">
            {formatBRL(totalAmount)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Soma dos itens da OS (serviços + produtos + mão de obra)</p>
        </div>

        {/* Financial block */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold tracking-wide uppercase">Financeiro</span>
          </div>
          {financialData ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Lançado</p>
                <p className="font-mono text-sm font-bold">{formatBRL(financialData.total)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Pago</p>
                <p className="font-mono text-sm font-bold text-primary">{formatBRL(financialData.paid)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Pendente</p>
                <p className={`font-mono text-sm font-bold ${financialData.pending > 0 ? "text-amber-600" : ""}`}>
                  {formatBRL(financialData.pending)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não lançado</p>
          )}
        </div>

        {/* References */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">Estimado</span>
            </div>
            <p className="font-mono text-sm">
              {estimatedValue != null ? formatBRL(estimatedValue) : (
                <span className="text-xs text-muted-foreground font-normal">Não informado</span>
              )}
            </p>
            <p className="text-[9px] text-muted-foreground">Ref. interna</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold tracking-wide uppercase">Orçamento</span>
            </div>
            <p className="font-mono text-sm">
              {quoteTotal != null ? formatBRL(quoteTotal) : (
                <span className="text-xs text-muted-foreground font-normal">Sem orçamento</span>
              )}
            </p>
            <p className="text-[9px] text-muted-foreground">Proposta ao cliente</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
