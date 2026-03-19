INSERT INTO public.subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '8864c139-2adf-43d0-8396-55d7b96f294f',
  'active',
  now(),
  '2099-12-31T23:59:59Z'
)
ON CONFLICT (tenant_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end;