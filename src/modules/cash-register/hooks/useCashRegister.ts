import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { executePaginatedQuery } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";

const db = supabase as any;

export type CashRegisterStatus = "open" | "closed";
export type CashMovementType = "sale" | "receipt" | "withdrawal" | "reinforcement" | "expense" | "adjustment";

export interface CashRegister {
  id: string;
  opened_by: string;
  opened_at: string;
  initial_amount: number;
  opening_bank_balance: number;
  status: CashRegisterStatus;
  closed_by: string | null;
  closed_at: string | null;
  expected_amount: number | null;
  counted_amount: number | null;
  difference_amount: number | null;
  expected_bank_balance: number | null;
  closing_bank_balance: number | null;
  difference_bank: number | null;
  notes: string | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  opened_by_name?: string;
  closed_by_name?: string;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  movement_type: CashMovementType;
  payment_method: string;
  amount: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  affects_cash: boolean;
  affects_bank: boolean;
  source_type: string;
  created_by: string | null;
  created_at: string;
  // joined
  created_by_name?: string;
}

export const movementTypeLabels: Record<CashMovementType, string> = {
  sale: "Venda",
  receipt: "Recebimento",
  withdrawal: "Sangria",
  reinforcement: "Reforço",
  expense: "Despesa",
  adjustment: "Ajuste",
};

export const movementTypeColors: Record<CashMovementType, string> = {
  sale: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  receipt: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  withdrawal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  reinforcement: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  adjustment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

// ── Get current open cash register for the tenant ──
export function useOpenCashRegister() {
  return useQuery<CashRegister | null>({
    queryKey: ["cash-register-open"],
    queryFn: async () => {
      // Find any open register for this tenant (one per tenant)
      const { data, error } = await db
        .from("cash_registers")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Fetch operator name separately to avoid FK join issues
      let openedByName: string | null = null;
      if (data.opened_by) {
        const { data: profile } = await db
          .from("profiles")
          .select("full_name")
          .eq("id", data.opened_by)
          .maybeSingle();
        openedByName = profile?.full_name || null;
      }

      return {
        ...data,
        opening_bank_balance: Number(data.opening_bank_balance ?? 0),
        opened_by_name: openedByName,
      } as CashRegister;
    },
    staleTime: 10000,
  });
}

// ── Movements for a register (paginated) ──
export function useCashMovements(registerId: string | undefined, page: number = 1) {
  return useQuery<PaginatedResult<CashMovement>>({
    queryKey: ["cash-movements", registerId, page],
    enabled: !!registerId,
    queryFn: async () => {
      return executePaginatedQuery<CashMovement>(
        { page },
        {
          table: "cash_register_movements",
          select: "*",
          defaultSort: { column: "created_at", ascending: false },
          additionalFilters: (q: any) => q.eq("cash_register_id", registerId),
          countFilters: (q: any) => q.eq("cash_register_id", registerId),
        }
      ).then(async (result) => {
        // Fetch profile names for created_by
        const userIds = [...new Set(result.items.map((m: any) => m.created_by).filter(Boolean))];
        let profileMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await db
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));
        }
        return {
          ...result,
          items: result.items.map((m: any) => ({
            ...m,
            created_by_name: profileMap[m.created_by] || null,
          })),
        };
      });
    },
  });
}

// ── History of all registers (paginated) ──
export function useCashRegisterHistory(
  page: number = 1,
  dateFrom?: string | null,
  dateTo?: string | null,
) {
  return useQuery<PaginatedResult<CashRegister>>({
    queryKey: ["cash-register-history", page, dateFrom, dateTo],
    queryFn: async () => {
      const result = await executePaginatedQuery<any>(
        { page },
        {
          table: "cash_registers",
          select: "*",
          defaultSort: { column: "opened_at", ascending: false },
          additionalFilters: (q: any) => {
            let query = q;
            if (dateFrom) query = query.gte("opened_at", dateFrom);
            if (dateTo) query = query.lte("opened_at", dateTo + "T23:59:59");
            return query;
          },
          countFilters: (q: any) => {
            let query = q;
            if (dateFrom) query = query.gte("opened_at", dateFrom);
            if (dateTo) query = query.lte("opened_at", dateTo + "T23:59:59");
            return query;
          },
        }
      );

      // Fetch profile names
      const userIds = [...new Set(result.items.flatMap((r: any) => [r.opened_by, r.closed_by].filter(Boolean)))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await db
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));
      }

      return {
        ...result,
        items: result.items.map((r: any) => ({
          ...r,
          opening_bank_balance: Number(r.opening_bank_balance ?? 0),
          opened_by_name: profileMap[r.opened_by] || null,
          closed_by_name: profileMap[r.closed_by] || null,
        })),
      };
    },
  });
}

// ── Summary totals for an open register ──
export function useCashRegisterSummary(registerId: string | undefined) {
  return useQuery({
    queryKey: ["cash-register-summary", registerId],
    enabled: !!registerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("cash_register_movements")
        .select("movement_type, payment_method, amount, affects_cash, affects_bank")
        .eq("cash_register_id", registerId);
      if (error) throw error;

      const movements = (data || []) as {
        movement_type: string; payment_method: string; amount: number;
        affects_cash: boolean; affects_bank: boolean;
      }[];

      const cash_in = movements.filter(m => m.amount > 0 && m.affects_cash).reduce((s, m) => s + Number(m.amount), 0);
      const bank_in = movements.filter(m => m.amount > 0 && m.affects_bank).reduce((s, m) => s + Number(m.amount), 0);
      const cash_out = movements.filter(m => m.amount < 0 && m.affects_cash).reduce((s, m) => s + Math.abs(Number(m.amount)), 0);
      const bank_out = movements.filter(m => m.amount < 0 && m.affects_bank).reduce((s, m) => s + Math.abs(Number(m.amount)), 0);

      const pix_in = movements.filter(m => m.amount > 0 && m.payment_method === "pix").reduce((s, m) => s + Number(m.amount), 0);
      const credit_in = movements.filter(m => m.amount > 0 && m.payment_method === "credit_card").reduce((s, m) => s + Number(m.amount), 0);
      const debit_in = movements.filter(m => m.amount > 0 && m.payment_method === "debit_card").reduce((s, m) => s + Number(m.amount), 0);
      const cash_money_in = movements.filter(m => m.amount > 0 && m.payment_method === "cash").reduce((s, m) => s + Number(m.amount), 0);
      const withdrawals = movements.filter(m => m.movement_type === "withdrawal").reduce((s, m) => s + Math.abs(Number(m.amount)), 0);
      const reinforcements = movements.filter(m => m.movement_type === "reinforcement").reduce((s, m) => s + Number(m.amount), 0);
      const expenses = movements.filter(m => m.movement_type === "expense").reduce((s, m) => s + Math.abs(Number(m.amount)), 0);
      const total_in = movements.filter(m => m.amount > 0).reduce((s, m) => s + Number(m.amount), 0);
      const total_out = movements.filter(m => m.amount < 0).reduce((s, m) => s + Math.abs(Number(m.amount)), 0);

      return {
        cash_in, bank_in, cash_out, bank_out,
        cash_money_in, pix_in, credit_in, debit_in,
        withdrawals, reinforcements, expenses, total_in, total_out,
      };
    },
    staleTime: 5000,
  });
}

// ── Open cash register (one per tenant) ──
export function useOpenCashRegisterMutation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { initial_amount: number; opening_bank_balance: number; notes?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      // Check if there's ANY open register for this tenant
      const { data: existing } = await db
        .from("cash_registers")
        .select("id")
        .eq("status", "open")
        .limit(1);
      if (existing && existing.length > 0) throw new Error("Já existe um caixa aberto para esta empresa");

      const { data, error } = await db
        .from("cash_registers")
        .insert({
          opened_by: userId,
          initial_amount: payload.initial_amount,
          opening_bank_balance: payload.opening_bank_balance,
          notes: payload.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-register-open"] });
      qc.invalidateQueries({ queryKey: ["cash-register-history"] });
      qc.invalidateQueries({ queryKey: ["financial-balances"] });
      toast({ title: "Caixa aberto com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro ao abrir caixa", description: e.message, variant: "destructive" }),
  });
}

// ── Close cash register ──
export function useCloseCashRegisterMutation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      register_id: string;
      counted_amount: number;
      counted_bank_balance?: number;
      closing_notes?: string;
    }) => {
      const { data, error } = await db.rpc("close_cash_register", {
        _register_id: payload.register_id,
        _counted_amount: payload.counted_amount,
        _closing_notes: payload.closing_notes || null,
        _counted_bank_balance: payload.counted_bank_balance ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-register-open"] });
      qc.invalidateQueries({ queryKey: ["cash-register-history"] });
      qc.invalidateQueries({ queryKey: ["cash-movements"] });
      qc.invalidateQueries({ queryKey: ["cash-register-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-balances"] });
      toast({ title: "Caixa fechado com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro ao fechar caixa", description: e.message, variant: "destructive" }),
  });
}

// ── Add movement ──
export function useAddCashMovement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      cash_register_id: string;
      movement_type: CashMovementType;
      payment_method?: string;
      amount: number;
      description: string;
      affects_cash?: boolean;
      affects_bank?: boolean;
      source_type?: string;
      reference_type?: string;
      reference_id?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const finalAmount = ["withdrawal", "expense"].includes(payload.movement_type)
        ? -Math.abs(payload.amount)
        : Math.abs(payload.amount);

      const { data, error } = await db.from("cash_register_movements").insert({
        cash_register_id: payload.cash_register_id,
        movement_type: payload.movement_type,
        payment_method: payload.payment_method || "cash",
        amount: finalAmount,
        description: payload.description,
        affects_cash: payload.affects_cash ?? true,
        affects_bank: payload.affects_bank ?? false,
        source_type: payload.source_type || "manual",
        reference_type: payload.reference_type || null,
        reference_id: payload.reference_id || null,
        created_by: userId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-movements"] });
      qc.invalidateQueries({ queryKey: ["cash-register-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-balances"] });
      toast({ title: "Movimentação registrada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

// ── Financial Balances (for dashboard) ──
export function useFinancialBalances() {
  return useQuery({
    queryKey: ["financial-balances"],
    queryFn: async () => {
      const defaults = {
        cash_balance: 0,
        bank_balance: 0,
        is_register_open: false,
        today_income: 0,
        today_expenses: 0,
        receivables_total: 0,
        payables_total: 0,
        overdue_count: 0,
      };
      const { data, error } = await db.rpc("get_financial_balances");
      if (error) throw error;
      return { ...defaults, ...data } as typeof defaults;
    },
    staleTime: 15000,
  });
}
