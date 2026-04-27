DO $$
DECLARE
  _order record;
  _current public.service_order_status;
  _to public.service_order_status;
  _statuses public.service_order_status[] := ARRAY[
    'awaiting_diagnosis'::public.service_order_status,
    'in_repair'::public.service_order_status,
    'in_testing'::public.service_order_status,
    'ready_for_pickup'::public.service_order_status,
    'delivered'::public.service_order_status
  ];
BEGIN
  SELECT id, status, tenant_id
  INTO _order
  FROM public.service_orders
  WHERE order_number = 'OS-001354';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OS-001354 não encontrada';
  END IF;

  _current := _order.status;

  FOREACH _to IN ARRAY _statuses LOOP
    IF _current <> _to AND _current <> 'delivered'::public.service_order_status THEN
      UPDATE public.service_orders
      SET status = _to,
          updated_at = now()
      WHERE id = _order.id;

      IF NOT EXISTS (
        SELECT 1
        FROM public.service_order_status_history
        WHERE service_order_id = _order.id
          AND from_status = _current
          AND to_status = _to
      ) THEN
        INSERT INTO public.service_order_status_history (
          service_order_id,
          from_status,
          to_status,
          notes,
          changed_by,
          tenant_id,
          created_at
        ) VALUES (
          _order.id,
          _current,
          _to,
          'OS concluída conforme solicitação administrativa. Cliente pagou, tudo certo.',
          NULL,
          _order.tenant_id,
          now()
        );
      END IF;

      _current := _to;
    END IF;
  END LOOP;
END $$;