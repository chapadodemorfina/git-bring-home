import { useState, useEffect, useCallback } from "react";
import {
  useActiveTimer, useStartTimer, usePauseTimer,
  useResumeTimer, useStopTimer, useTimerSessions, TimerSession,
} from "../hooks/useRepairTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Play, Pause, Square, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  serviceOrderId: string;
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LiveTimer({ session }: { session: TimerSession }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (session.status === "paused") {
      setElapsed(session.accumulated_seconds);
      return;
    }
    // running: accumulated + (now - started_at)
    const tick = () => {
      const now = Date.now();
      const startedAt = new Date(session.started_at).getTime();
      const currentSegment = Math.floor((now - startedAt) / 1000);
      setElapsed(session.accumulated_seconds + currentSegment);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.status, session.started_at, session.accumulated_seconds]);

  return (
    <span className="text-3xl font-mono font-bold tabular-nums tracking-wider">
      {formatDuration(elapsed)}
    </span>
  );
}

export default function RepairTimer({ serviceOrderId }: Props) {
  const { data: active, isLoading } = useActiveTimer(serviceOrderId);
  const { data: allSessions } = useTimerSessions(serviceOrderId);
  const startTimer = useStartTimer();
  const pauseTimer = usePauseTimer();
  const resumeTimer = useResumeTimer();
  const stopTimer = useStopTimer();
  const [showHistory, setShowHistory] = useState(false);

  const stoppedSessions = allSessions?.filter(s => s.status === "stopped") || [];
  const totalStopped = stoppedSessions.reduce((sum, s) => sum + s.accumulated_seconds, 0);

  const isPending = startTimer.isPending || pauseTimer.isPending || resumeTimer.isPending || stopTimer.isPending;

  return (
    <Card className={active?.status === "running" ? "border-primary/50 bg-primary/[0.03]" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4" /> Cronômetro de Reparo
          {active && (
            <Badge variant={active.status === "running" ? "default" : "secondary"} className="text-[10px]">
              {active.status === "running" ? "Em andamento" : "Pausado"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Timer Display */}
        <div className="flex flex-col items-center gap-3">
          {active ? (
            <LiveTimer session={active} />
          ) : (
            <span className="text-3xl font-mono font-bold tabular-nums tracking-wider text-muted-foreground">
              00:00:00
            </span>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!active ? (
              <Button onClick={() => startTimer.mutate(serviceOrderId)} disabled={isPending} size="sm">
                <Play className="mr-1 h-4 w-4" /> Iniciar
              </Button>
            ) : (
              <>
                {active.status === "running" ? (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => pauseTimer.mutate({ session: active })}
                    disabled={isPending}
                  >
                    <Pause className="mr-1 h-4 w-4" /> Pausar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => resumeTimer.mutate({ session: active })}
                    disabled={isPending}
                  >
                    <Play className="mr-1 h-4 w-4" /> Retomar
                  </Button>
                )}
                <Button
                  variant="destructive" size="sm"
                  onClick={() => stopTimer.mutate({ session: active })}
                  disabled={isPending}
                >
                  <Square className="mr-1 h-4 w-4" /> Parar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Total & History */}
        {stoppedSessions.length > 0 && (
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                <History className="mr-1 h-3 w-3" />
                {stoppedSessions.length} sessão(ões) · Total: {formatDuration(totalStopped)}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-2">
              {stoppedSessions.map(s => (
                <div key={s.id} className="flex justify-between text-xs px-2 py-1 rounded bg-muted/50">
                  <span>{new Date(s.created_at).toLocaleDateString("pt-BR")} {new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-mono">{formatDuration(s.accumulated_seconds)}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
