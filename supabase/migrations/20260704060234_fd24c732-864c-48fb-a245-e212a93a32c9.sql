-- Fase 2A.5c-2.1b: restringir mark_overdue_receivables() a job/service_role
REVOKE EXECUTE ON FUNCTION public.mark_overdue_receivables() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_receivables() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_receivables() FROM authenticated;
-- Mantém EXECUTE para service_role (jobs/scheduled tasks) e owner (postgres)
GRANT EXECUTE ON FUNCTION public.mark_overdue_receivables() TO service_role;