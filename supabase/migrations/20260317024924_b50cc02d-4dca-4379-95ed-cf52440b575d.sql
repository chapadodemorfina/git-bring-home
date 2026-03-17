
-- Timer sessions for tracking real repair time at the bench
CREATE TABLE public.repair_timer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  ended_at timestamptz,
  accumulated_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'stopped')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_timer_sessions ENABLE ROW LEVEL SECURITY;

-- Technicians can see/manage their own timers; admins/managers see all
CREATE POLICY "tech_select_own_timers" ON public.repair_timer_sessions
  FOR SELECT TO authenticated
  USING (
    technician_id = auth.uid() OR
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "tech_insert_own_timers" ON public.repair_timer_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    technician_id = auth.uid() AND
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role])
  );

CREATE POLICY "tech_update_own_timers" ON public.repair_timer_sessions
  FOR UPDATE TO authenticated
  USING (
    technician_id = auth.uid() OR
    has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "admin_delete_timers" ON public.repair_timer_sessions
  FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Index for quick lookups
CREATE INDEX idx_repair_timer_sessions_so ON public.repair_timer_sessions(service_order_id);
CREATE INDEX idx_repair_timer_sessions_tech ON public.repair_timer_sessions(technician_id);
