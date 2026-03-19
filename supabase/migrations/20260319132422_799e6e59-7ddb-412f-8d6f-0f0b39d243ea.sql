CREATE OR REPLACE FUNCTION public.trg_check_service_order_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _effective_tenant_id uuid;
BEGIN
  _effective_tenant_id := COALESCE(NEW.tenant_id, public.get_active_tenant_id());

  IF _effective_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ativo não identificado para validar limite do plano.'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.tenant_id := COALESCE(NEW.tenant_id, _effective_tenant_id);

  PERFORM public.check_plan_limits(_effective_tenant_id, 'service_orders');
  RETURN NEW;
END;
$function$;