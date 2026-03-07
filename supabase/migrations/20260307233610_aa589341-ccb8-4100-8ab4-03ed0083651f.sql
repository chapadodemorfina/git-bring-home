
-- Enums for structured diagnosis
CREATE TYPE public.diagnosis_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE public.repair_viability AS ENUM ('repairable', 'not_repairable', 'uncertain');
CREATE TYPE public.test_result AS ENUM ('pass', 'fail', 'abnormal', 'inconclusive', 'not_tested');
CREATE TYPE public.fault_severity AS ENUM ('minor', 'moderate', 'severe', 'critical');

-- Add new columns to existing diagnostics table
ALTER TABLE public.diagnostics
  ADD COLUMN IF NOT EXISTS diagnosis_status public.diagnosis_status NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS repair_viability public.repair_viability DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS diagnosis_started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS diagnosis_completed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS not_repairable_reason text DEFAULT NULL;

-- Diagnosis tests table
CREATE TABLE public.diagnosis_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  test_category text DEFAULT NULL,
  test_result public.test_result NOT NULL DEFAULT 'not_tested',
  measured_value text DEFAULT NULL,
  notes text DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Diagnosis faults table
CREATE TABLE public.diagnosis_faults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  fault_type text NOT NULL,
  fault_description text DEFAULT NULL,
  severity public.fault_severity NOT NULL DEFAULT 'moderate',
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Diagnosis parts table
CREATE TABLE public.diagnosis_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid NOT NULL REFERENCES public.diagnostics(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  estimated_unit_cost numeric NOT NULL DEFAULT 0,
  product_id uuid DEFAULT NULL REFERENCES public.products(id),
  supplier text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_diagnosis_tests_diagnosis ON public.diagnosis_tests(diagnosis_id);
CREATE INDEX idx_diagnosis_faults_diagnosis ON public.diagnosis_faults(diagnosis_id);
CREATE INDEX idx_diagnosis_parts_diagnosis ON public.diagnosis_parts(diagnosis_id);

-- RLS
ALTER TABLE public.diagnosis_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_parts ENABLE ROW LEVEL SECURITY;

-- Tests RLS
CREATE POLICY "tech_select_dt" ON public.diagnosis_tests FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role, 'front_desk'::app_role]));

CREATE POLICY "tech_insert_dt" ON public.diagnosis_tests FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

CREATE POLICY "tech_update_dt" ON public.diagnosis_tests FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

CREATE POLICY "tech_delete_dt" ON public.diagnosis_tests FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

-- Faults RLS
CREATE POLICY "tech_select_df" ON public.diagnosis_faults FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role, 'front_desk'::app_role]));

CREATE POLICY "tech_insert_df" ON public.diagnosis_faults FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

CREATE POLICY "tech_update_df" ON public.diagnosis_faults FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

CREATE POLICY "tech_delete_df" ON public.diagnosis_faults FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

-- Parts RLS
CREATE POLICY "tech_select_dp2" ON public.diagnosis_parts FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role, 'front_desk'::app_role, 'finance'::app_role]));

CREATE POLICY "tech_insert_dp2" ON public.diagnosis_parts FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

CREATE POLICY "tech_update_dp2" ON public.diagnosis_parts FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));

CREATE POLICY "tech_delete_dp2" ON public.diagnosis_parts FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role, 'bench_technician'::app_role, 'field_technician'::app_role]));
