import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export interface TimerSession {
  id: string;
  service_order_id: string;
  technician_id: string;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  accumulated_seconds: number;
  status: "running" | "paused" | "stopped";
  notes: string | null;
  created_at: string;
}

export function useTimerSessions(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["repair-timers", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_timer_sessions")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TimerSession[];
    },
  });
}

export function useActiveTimer(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["repair-timer-active", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("repair_timer_sessions")
        .select("*")
        .eq("service_order_id", serviceOrderId!)
        .in("status", ["running", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TimerSession | null;
    },
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (serviceOrderId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await db.from("repair_timer_sessions").insert({
        service_order_id: serviceOrderId,
        technician_id: user.id,
        status: "running",
      }).select().single();
      if (error) throw error;
      return data as TimerSession;
    },
    onSuccess: (_, soId) => {
      qc.invalidateQueries({ queryKey: ["repair-timer-active", soId] });
      qc.invalidateQueries({ queryKey: ["repair-timers", soId] });
      toast({ title: "Timer iniciado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function usePauseTimer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ session }: { session: TimerSession }) => {
      const now = new Date();
      const started = new Date(session.paused_at ? session.started_at : session.started_at);
      // Calculate elapsed since last resume
      const lastResumeOrStart = session.paused_at ? new Date(session.started_at) : started;
      const elapsed = Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000);
      // accumulated_seconds already has previous pauses accounted; add current running segment
      const runningSegment = session.paused_at
        ? 0
        : Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000) - session.accumulated_seconds;
      const newAccumulated = session.accumulated_seconds + Math.max(0, runningSegment);

      const { error } = await db
        .from("repair_timer_sessions")
        .update({
          status: "paused",
          paused_at: now.toISOString(),
          accumulated_seconds: newAccumulated,
        })
        .eq("id", session.id);
      if (error) throw error;
      return session.service_order_id;
    },
    onSuccess: (soId) => {
      qc.invalidateQueries({ queryKey: ["repair-timer-active", soId] });
      qc.invalidateQueries({ queryKey: ["repair-timers", soId] });
    },
  });
}

export function useResumeTimer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ session }: { session: TimerSession }) => {
      // Reset started_at to now so we can track the new running segment
      const { error } = await db
        .from("repair_timer_sessions")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          paused_at: null,
        })
        .eq("id", session.id);
      if (error) throw error;
      return session.service_order_id;
    },
    onSuccess: (soId) => {
      qc.invalidateQueries({ queryKey: ["repair-timer-active", soId] });
      qc.invalidateQueries({ queryKey: ["repair-timers", soId] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ session, notes }: { session: TimerSession; notes?: string }) => {
      const now = new Date();
      let finalAccumulated = session.accumulated_seconds;
      if (session.status === "running") {
        const runningSegment = Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000);
        finalAccumulated = session.accumulated_seconds + Math.max(0, runningSegment - session.accumulated_seconds);
        // Simpler: just use accumulated + (now - started_at) if running
        finalAccumulated = session.accumulated_seconds + Math.max(0, Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000));
        // But accumulated_seconds already has prior segments. When running, started_at was reset on resume.
        // So current segment = now - started_at. Total = accumulated + current segment.
        finalAccumulated = session.accumulated_seconds + Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000);
      }

      const { error } = await db
        .from("repair_timer_sessions")
        .update({
          status: "stopped",
          ended_at: now.toISOString(),
          accumulated_seconds: finalAccumulated,
          notes: notes || null,
        })
        .eq("id", session.id);
      if (error) throw error;
      return session.service_order_id;
    },
    onSuccess: (soId) => {
      qc.invalidateQueries({ queryKey: ["repair-timer-active", soId] });
      qc.invalidateQueries({ queryKey: ["repair-timers", soId] });
      toast({ title: "Timer finalizado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

/** Total seconds across all stopped sessions for an SO */
export function useTotalRepairTime(serviceOrderId: string | undefined) {
  const { data: sessions } = useTimerSessions(serviceOrderId);
  const stopped = sessions?.filter(s => s.status === "stopped") || [];
  return stopped.reduce((sum, s) => sum + s.accumulated_seconds, 0);
}
