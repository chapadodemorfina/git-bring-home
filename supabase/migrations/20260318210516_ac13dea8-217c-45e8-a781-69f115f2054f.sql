CREATE OR REPLACE FUNCTION public.enforce_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  CASE OLD.status::text
    WHEN 'received' THEN allowed := ARRAY['triage','cancelled'];
    WHEN 'triage' THEN allowed := ARRAY['awaiting_diagnosis','cancelled'];
    WHEN 'awaiting_diagnosis' THEN allowed := ARRAY['awaiting_quote','in_repair','cancelled'];
    WHEN 'awaiting_quote' THEN allowed := ARRAY['awaiting_customer_approval','cancelled'];
    WHEN 'awaiting_customer_approval' THEN allowed := ARRAY['awaiting_parts','in_repair','cancelled'];
    WHEN 'awaiting_parts' THEN allowed := ARRAY['in_repair','cancelled'];
    WHEN 'in_repair' THEN allowed := ARRAY['in_testing','awaiting_parts','cancelled'];
    WHEN 'in_testing' THEN allowed := ARRAY['ready_for_pickup','in_repair','cancelled'];
    WHEN 'ready_for_pickup' THEN allowed := ARRAY['delivered'];
    WHEN 'delivered' THEN allowed := ARRAY['warranty_return'];
    WHEN 'warranty_return' THEN allowed := ARRAY['triage'];
    WHEN 'cancelled' THEN allowed := ARRAY[]::text[];
    ELSE allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status::text = ANY(allowed)) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$