
CREATE OR REPLACE FUNCTION public.quotes_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _r jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', count(*),
    'draft', (SELECT count(*) FROM public.quotes WHERE status = 'draft'),
    'sent', (SELECT count(*) FROM public.quotes WHERE status = 'sent'),
    'approved', (SELECT count(*) FROM public.quotes WHERE status = 'approved'),
    'rejected', (SELECT count(*) FROM public.quotes WHERE status = 'rejected'),
    'expired', (SELECT count(*) FROM public.quotes WHERE status = 'expired'),
    'cancelled', (SELECT count(*) FROM public.quotes WHERE status = 'cancelled'),
    'total_approved_value', (SELECT COALESCE(SUM(total_amount), 0) FROM public.quotes WHERE status = 'approved'),
    'total_rejected_value', (SELECT COALESCE(SUM(total_amount), 0) FROM public.quotes WHERE status = 'rejected'),
    'total_estimated_profit', (SELECT COALESCE(SUM(estimated_profit), 0) FROM public.quotes WHERE status = 'approved'),
    'approval_rate', CASE WHEN (SELECT count(*) FROM public.quotes WHERE status IN ('approved','rejected')) > 0
      THEN ROUND((SELECT count(*) FROM public.quotes WHERE status = 'approved')::numeric / (SELECT count(*) FROM public.quotes WHERE status IN ('approved','rejected')) * 100, 1) ELSE 0 END,
    'avg_approval_days', (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400)::numeric, 1), 0) FROM public.quotes WHERE status = 'approved' AND approved_at IS NOT NULL)
  ) INTO _r FROM public.quotes;
  RETURN _r;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_stale_commercial_quotes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _count integer;
BEGIN
  WITH expired AS (
    UPDATE public.quotes SET status = 'expired', updated_at = now()
    WHERE status IN ('draft','sent') AND valid_until IS NOT NULL AND valid_until < CURRENT_DATE
    RETURNING id
  ) SELECT COUNT(*) INTO _count FROM expired;
  INSERT INTO public.quote_history (quote_id, action, notes)
  SELECT e.id, 'expired', 'Expirado automaticamente'
  FROM public.quotes e WHERE e.status = 'expired' AND e.updated_at >= now() - interval '1 minute';
  RETURN _count;
END; $$;
