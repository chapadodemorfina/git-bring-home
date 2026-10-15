-- Maintenance is limited to two technical logs and one named retention job.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

TRUNCATE TABLE ONLY cron.job_run_details, ONLY net._http_response
  CONTINUE IDENTITY RESTRICT;

DO $maintenance$
BEGIN
  PERFORM cron.schedule(
    'daily-cleanup-internal-logs',
    '0 6 * * *',
    $retention$DELETE FROM cron.job_run_details
WHERE status IN ('succeeded', 'failed')
  AND end_time < now() - interval '3 days';
DELETE FROM net._http_response
WHERE created < now() - interval '3 days';$retention$
  );
END
$maintenance$;

COMMIT;

-- Verification contains metadata only, never stored job commands or responses.
SELECT jsonb_build_object(
  'verified_at', now(),
  'database_name', current_database(),
  'database_bytes', pg_database_size(current_database()),
  'relations', (
    SELECT jsonb_agg(to_jsonb(r)) FROM (
      SELECT n.nspname AS schema_name, c.relname AS table_name,
             pg_total_relation_size(c.oid) AS total_bytes
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.oid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
      ORDER BY n.nspname, c.relname
    ) AS r
  ),
  'jobs', (
    SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM (
      SELECT jobid, jobname, schedule, active, database, username,
             md5(command) AS command_fingerprint
      FROM cron.job
      ORDER BY jobid
    ) AS r
  )
) AS maintenance_result;
