
-- Re-create dropped policies with correct role names
CREATE POLICY "Authenticated read scrap_triage" ON public.scrap_triage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/tech insert scrap_triage" ON public.scrap_triage
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','bench_technician','field_technician']::app_role[]));

CREATE POLICY "Admin/tech update scrap_triage" ON public.scrap_triage
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bench_technician','field_technician']::app_role[]));

CREATE POLICY "Admin delete scrap_triage" ON public.scrap_triage
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read scrap_carcass_details" ON public.scrap_carcass_details
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/tech insert scrap_carcass_details" ON public.scrap_carcass_details
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','bench_technician','field_technician']::app_role[]));

CREATE POLICY "Admin/tech update scrap_carcass_details" ON public.scrap_carcass_details
  FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','bench_technician','field_technician']::app_role[]));

CREATE POLICY "Admin delete scrap_carcass_details" ON public.scrap_carcass_details
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
