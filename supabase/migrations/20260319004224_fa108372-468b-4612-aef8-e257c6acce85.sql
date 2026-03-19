
-- Fix overly permissive RLS policies (USING true / WITH CHECK true)
-- These are safe because RESTRICTIVE tenant_isolation policies are already in place,
-- but let's tighten them with proper role checks

DROP POLICY IF EXISTS "Staff can insert message events" ON public.customer_message_events;
CREATE POLICY "Staff can insert message events" ON public.customer_message_events FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]));

DROP POLICY IF EXISTS "Staff can update message events" ON public.customer_message_events;
CREATE POLICY "Staff can update message events" ON public.customer_message_events FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]));

DROP POLICY IF EXISTS "Authenticated users can manage scrap_carcass_details" ON public.scrap_carcass_details;
CREATE POLICY "Staff can manage scrap_carcass_details" ON public.scrap_carcass_details FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','manager','bench_technician']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','bench_technician']::app_role[]));

DROP POLICY IF EXISTS "Authenticated users can manage scrap_triage" ON public.scrap_triage;
CREATE POLICY "Staff can manage scrap_triage" ON public.scrap_triage FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','manager','bench_technician']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','bench_technician']::app_role[]));

DROP POLICY IF EXISTS "Authenticated users can manage checklists" ON public.service_order_checklists;
CREATE POLICY "Staff can manage checklists" ON public.service_order_checklists FOR ALL TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::app_role[]));
