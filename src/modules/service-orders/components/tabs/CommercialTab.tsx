import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, CreditCard, AlertCircle, ShoppingCart, TrendingUp } from "lucide-react";
import ItemsTab from "./ItemsTab";
import FinancialTab from "./FinancialTab";

const db = supabase as any;

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  serviceOrderId: string;
  totalAmount: number;
  orderStatus: string;
}

export default function CommercialTab({ serviceOrderId, totalAmount, orderStatus }: Props) {
  const { data: entries } = useQuery({
    queryKey: ["so-financial-entries", serviceOrderId],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_entries")
        .select("*")
        .eq("service_order_id", serviceOrderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const allEntries = entries || [];
  const primaryRevenue = allEntries.find(
    (e: any) => e.is_primary_os_revenue && e.entry_type === "revenue" && e.status !== "cancelled"
  );
  const primaryAmount = Number(primaryRevenue?.amount || 0);
  const primaryPaid = Number(primaryRevenue?.paid_amount || 0);
  const primaryPending = Math.max(0, primaryAmount - primaryPaid);
  const primaryStatus = primaryRevenue?.status || "pending";

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendente", variant: "outline" },
    partial: { label: "Parcial", variant: "secondary" },
    paid: { label: "Quitado", variant: "default" },
    cancelled: { label: "Cancelado", variant: "destructive" },
    overdue: { label: "Vencido", variant: "destructive" },
  };

  const cfg = statusConfig[primaryStatus] || statusConfig.pending;

  return (
    <div className="space-y-6">
      {/* Block 1 — Unified Financial Summary */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Main total row */}
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* Total OS */}
            <div className="flex-1 p-4 sm:p-5 flex items-center gap-3 border-b sm:border-b-0 sm:border-r border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total da OS</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-primary">{formatBRL(totalAmount)}</p>
              </div>
            </div>

            {/* KPI grid */}
            <div className="flex-1 grid grid-cols-3 divide-x divide-border">
              {/* Receita */}
              <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Receita</p>
                <p className="text-sm sm:text-base font-bold font-mono mt-0.5">{formatBRL(primaryAmount)}</p>
              </div>
              {/* Pago */}
              <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                <CreditCard className="h-4 w-4 text-green-600 mb-1" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pago</p>
                <p className="text-sm sm:text-base font-bold font-mono text-green-600 mt-0.5">{formatBRL(primaryPaid)}</p>
              </div>
              {/* Pendente */}
              <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                <AlertCircle className={`h-4 w-4 mb-1 ${primaryPending > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pendente</p>
                <p className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${primaryPending > 0 ? "text-amber-600" : ""}`}>
                  {formatBRL(primaryPending)}
                </p>
              </div>
            </div>
          </div>

          {/* Status footer */}
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Status financeiro</span>
            </div>
            <Badge variant={cfg.variant} className="text-[10px]">
              {cfg.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Block 2 — Items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Itens da OS</span>
          <Separator className="flex-1" />
        </div>
        <ItemsTab serviceOrderId={serviceOrderId} hideSummary />
      </div>

      {/* Block 3 — Financial Entries */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Financeiro</span>
          <Separator className="flex-1" />
        </div>
        <FinancialTab
          serviceOrderId={serviceOrderId}
          totalAmount={totalAmount}
          orderStatus={orderStatus}
          hideSummary
        />
      </div>
    </div>
  );
}
