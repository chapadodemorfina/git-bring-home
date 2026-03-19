
-- ╔══════════════════════════════════════════════════════════════╗
-- ║  TENANT-SCOPED SEQUENCES (replace global pg sequences)      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. Create tenant_counters table
CREATE TABLE IF NOT EXISTS public.tenant_counters (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, key)
);

ALTER TABLE public.tenant_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_tenant_counters" ON public.tenant_counters
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_active_tenant_id())
  WITH CHECK (tenant_id = public.get_active_tenant_id());

-- 2. Atomic function to get next sequence value per tenant
CREATE OR REPLACE FUNCTION public.get_next_sequence(_tenant_id uuid, _key text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next bigint;
BEGIN
  INSERT INTO public.tenant_counters (tenant_id, key, value)
  VALUES (_tenant_id, _key, 1)
  ON CONFLICT (tenant_id, key)
  DO UPDATE SET value = tenant_counters.value + 1
  RETURNING value INTO _next;
  
  RETURN _next;
END;
$$;

-- 3. Seed counters from existing data
INSERT INTO public.tenant_counters (tenant_id, key, value)
SELECT tenant_id, 'service_order_number', 
  COALESCE(MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::bigint), 0)
FROM public.service_orders
GROUP BY tenant_id
ON CONFLICT (tenant_id, key) DO UPDATE SET value = GREATEST(tenant_counters.value, EXCLUDED.value);

INSERT INTO public.tenant_counters (tenant_id, key, value)
SELECT tenant_id, 'sale_number',
  COALESCE(MAX(NULLIF(regexp_replace(sale_number, '[^0-9]', '', 'g'), '')::bigint), 0)
FROM public.sales
GROUP BY tenant_id
ON CONFLICT (tenant_id, key) DO UPDATE SET value = GREATEST(tenant_counters.value, EXCLUDED.value);

INSERT INTO public.tenant_counters (tenant_id, key, value)
SELECT tenant_id, 'quote_number',
  COALESCE(MAX(NULLIF(regexp_replace(quote_number, '[^0-9]', '', 'g'), '')::bigint), 0)
FROM public.repair_quotes
GROUP BY tenant_id
ON CONFLICT (tenant_id, key) DO UPDATE SET value = GREATEST(tenant_counters.value, EXCLUDED.value);

INSERT INTO public.tenant_counters (tenant_id, key, value)
SELECT tenant_id, 'warranty_number',
  COALESCE(MAX(NULLIF(regexp_replace(warranty_number, '[^0-9]', '', 'g'), '')::bigint), 0)
FROM public.warranties
GROUP BY tenant_id
ON CONFLICT (tenant_id, key) DO UPDATE SET value = GREATEST(tenant_counters.value, EXCLUDED.value);

-- 4. Replace service_orders.order_number default
ALTER TABLE public.service_orders 
  ALTER COLUMN order_number DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.trg_set_order_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'OS-' || lpad(get_next_sequence(NEW.tenant_id, 'service_order_number')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_number ON public.service_orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_order_number();

-- 5. Replace repair_quotes.quote_number default
ALTER TABLE public.repair_quotes
  ALTER COLUMN quote_number DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.trg_set_quote_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'ORC-' || lpad(get_next_sequence(NEW.tenant_id, 'quote_number')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_number ON public.repair_quotes;
CREATE TRIGGER trg_quote_number
  BEFORE INSERT ON public.repair_quotes
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_quote_number();

-- 6. Replace sales.sale_number trigger (already exists, just replace function)
CREATE OR REPLACE FUNCTION public.trg_set_sale_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'VEN-' || lpad(get_next_sequence(NEW.tenant_id, 'sale_number')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Replace warranties.warranty_number default
ALTER TABLE public.warranties
  ALTER COLUMN warranty_number DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.trg_set_warranty_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.warranty_number IS NULL OR NEW.warranty_number = '' THEN
    NEW.warranty_number := 'GAR-' || lpad(get_next_sequence(NEW.tenant_id, 'warranty_number')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warranty_number ON public.warranties;
CREATE TRIGGER trg_warranty_number
  BEFORE INSERT ON public.warranties
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_warranty_number();

-- 8. Drop old global sequences
DROP SEQUENCE IF EXISTS public.service_order_number_seq CASCADE;
DROP SEQUENCE IF EXISTS public.sale_number_seq CASCADE;
