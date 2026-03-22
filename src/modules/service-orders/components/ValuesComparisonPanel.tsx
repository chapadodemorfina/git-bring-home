import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Calculator, ShoppingCart } from "lucide-react";

const db = supabase as any;

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  serviceOrderId: string;
  estimatedValue: number | null;
}

export default function ValuesComparisonPanel({ serviceOrderId, estimatedValue }: Props) {
  // OS items total
  const { data: itemsTotal } = useQuery({
    queryKey: ["so-items-total", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_items")
        .select("total_price")
        .eq("service_order_id", serviceOrderId);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return (data as any[]).reduce((sum: number, e: any) => sum + Number(e.total_price), 0);
    },
  });

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

  // Sum of revenue financial entries
  const { data: financialTotal } = useQuery({
    queryKey: ["so-financial-total", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("amount")
        .eq("service_order_id", serviceOrderId)
        .eq("entry_type", "revenue")
        .neq("status", "cancelled");
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return (data as any[]).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    },
  });

  const blocks = [
    {
      label: "Total OS",
      description: "Soma dos itens da OS",
      value: itemsTotal,
      emptyText: "Sem itens",
      icon: ShoppingCart,
      accent: true,
    },
    {
      label: "Estimado",
      description: "Previsão interna",
      value: estimatedValue,
      emptyText: "Não informado",
      icon: Calculator,
      accent: false,
    },
    {
      label: "Orçamento",
      description: "Proposta ao cliente",
      value: quoteTotal,
      emptyText: "Sem orçamento",
      icon: FileText,
      accent: false,
    },
    {
      label: "Financeiro",
      description: "Valor oficial lançado",
      value: financialTotal,
      emptyText: "Não lançado",
      icon: DollarSign,
      accent: false,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resumo de Valores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {blocks.map((b) => (
            <div
              key={b.label}
              className={`rounded-lg border p-3 space-y-1 ${
                b.accent
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <b.icon className={`h-3.5 w-3.5 ${b.accent ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-semibold tracking-wide uppercase">
                  {b.label}
                </span>
                {b.accent && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto border-primary/30 text-primary">
                    Principal
                  </Badge>
                )}
              </div>
              <p className={`font-mono text-lg font-bold ${b.accent ? "text-primary" : ""}`}>
                {b.value != null ? formatBRL(b.value) : (
                  <span className="text-sm font-normal text-muted-foreground">{b.emptyText}</span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
