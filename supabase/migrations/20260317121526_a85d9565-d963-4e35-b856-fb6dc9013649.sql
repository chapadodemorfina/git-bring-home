CREATE OR REPLACE FUNCTION public.generate_public_tracking_token(_service_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _token text;
  _link_id uuid;
BEGIN
  _token := encode(extensions.gen_random_bytes(24), 'hex');

  UPDATE service_order_public_links SET status = 'revoked', revoked_at = now()
  WHERE service_order_id = _service_order_id AND status = 'active';

  INSERT INTO service_order_public_links (service_order_id, public_token, created_by)
  VALUES (_service_order_id, _token, auth.uid())
  RETURNING id INTO _link_id;

  RETURN jsonb_build_object('id', _link_id, 'token', _token);
END;
$function$;