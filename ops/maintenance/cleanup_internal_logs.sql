-- Authorized operational maintenance only: technical logs and one retention job.
-- Existing jobs, business tables, notification queues and sequences are preserved.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $maintenance$
DECLARE
  v_cron_log oid := to_regclass('cron.job_run_details');
  v_http_log oid := to_regclass('net._http_response');
  v_retention_name constant text := 'daily-cleanup-internal-logs';
  v_retention_schedule constant text := '0 6 * * *';
  v_retention_command constant text := $retention$DELETE FROM cron.job_run_details
WHERE status IN ('succeeded', 'failed')
  AND end_time < now() - interval '3 days';
DELETE FROM net._http_response
WHERE created < now() - interval '3 days';$retention$;
  v_existing record;
  v_job_count bigint;
  v_job_id bigint;
BEGIN
  IF v_cron_log IS NULL OR v_http_log IS NULL OR to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION 'Required cron/pg_net relations are absent; no changes applied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Maintenance requires an authorized role able to inspect all cron owners';
  END IF;

  -- Acquire all required locks before examining structural guards. A timeout
  -- aborts the transaction instead of waiting behind application activity.
  LOCK TABLE ONLY cron.job IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE ONLY cron.job_run_details IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE ONLY net._http_response IN ACCESS EXCLUSIVE MODE;

  IF (SELECT count(*) FROM pg_class WHERE oid IN (v_cron_log, v_http_log) AND relkind = 'r') <> 2 THEN
    RAISE EXCEPTION 'Log targets must be ordinary tables; no changes applied';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES (v_cron_log, 'pg_cron'), (v_http_log, 'pg_net')) AS expected(relation_id, extension_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid = d.refobjid
      WHERE d.classid = 'pg_class'::regclass AND d.objid = expected.relation_id
        AND d.refclassid = 'pg_extension'::regclass AND d.deptype = 'e'
        AND e.extname = expected.extension_name
    )
  ) THEN
    RAISE EXCEPTION 'Log targets do not belong to the expected extensions; no changes applied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = v_cron_log AND attname = 'end_time'
      AND atttypid = 'timestamptz'::regtype AND attnum > 0 AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = v_cron_log AND attname = 'status'
      AND atttypid = 'text'::regtype AND attnum > 0 AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = v_http_log AND attname = 'created'
      AND atttypid = 'timestamptz'::regtype AND attnum > 0 AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Required retention columns have unexpected definitions; no changes applied';
  END IF;

  IF NOT has_table_privilege(v_cron_log, 'SELECT')
     OR NOT has_table_privilege(v_cron_log, 'DELETE')
     OR NOT has_table_privilege(v_cron_log, 'TRUNCATE')
     OR NOT has_table_privilege(v_http_log, 'SELECT')
     OR NOT has_table_privilege(v_http_log, 'DELETE')
     OR NOT has_table_privilege(v_http_log, 'TRUNCATE') THEN
    RAISE EXCEPTION 'Insufficient log maintenance privileges; no changes applied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype = 'f'
      AND (conrelid IN (v_cron_log, v_http_log) OR confrelid IN (v_cron_log, v_http_log))
  ) OR EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid IN (v_cron_log, v_http_log) AND NOT tgisinternal
  ) OR EXISTS (
    SELECT 1 FROM pg_inherits
    WHERE inhparent IN (v_cron_log, v_http_log) OR inhrelid IN (v_cron_log, v_http_log)
  ) THEN
    RAISE EXCEPTION 'Foreign keys, user triggers or inheritance require review; no changes applied';
  END IF;

  -- BEGIN LOG CONSUMER GUARD
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.prokind IN ('f', 'p')
      AND (
        p.prosrc ~* '(job_run_details|_http_response)'
        OR EXISTS (
          SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
            AND d.refclassid = 'pg_class'::regclass AND d.refobjid IN (v_cron_log, v_http_log)
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
          AND d.refclassid = 'pg_extension'::regclass AND d.deptype = 'e'
          AND e.extname IN ('pg_cron', 'pg_net')
      )
      -- The platform DDL helper only manages privileges. Accept its reviewed
      -- body and catalog shape, never its name alone. No helper is executed.
      -- Source: supabase/postgres@8b0ef1ef942e18493bf5c89087eff7b030c0e26d,
      -- migrations/db/migrations/20260730000000_revoke_trigger_on_cron_tables_from_postgres.sql
      AND NOT
      -- BEGIN VERIFIED PLATFORM GRANT
      COALESCE((
        p.pronamespace = to_regnamespace('extensions')
        AND p.proname = 'grant_pg_cron_access'
        AND p.prokind = 'f'
        AND p.pronargs = 0
        AND p.pronargdefaults = 0
        AND p.provariadic = 0
        AND p.proallargtypes IS NULL
        AND p.proargmodes IS NULL
        AND p.prorettype = 'pg_catalog.event_trigger'::regtype
        AND p.prolang = (
          SELECT oid FROM pg_catalog.pg_language WHERE lanname = 'plpgsql'
        )
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'supabase_admin'
        AND NOT p.prosecdef
        AND NOT p.proretset
        AND NOT p.proisstrict
        AND NOT p.proleakproof
        AND p.provolatile = 'v'
        AND p.proparallel = 'u'
        AND p.proconfig IS NULL
        AND pg_catalog.encode(
          pg_catalog.sha256(
            pg_catalog.convert_to(
              pg_catalog.btrim(
                pg_catalog.replace(p.prosrc, E'\r\n', E'\n'), E' \t\r\n'
              ), 'UTF8'
            )
          ), 'hex'
        ) = 'ccca00e6a47ee295704efda0585689cbb1802071c64adfd62b39879cf1f383a2'
        AND (
          SELECT count(*) = 1 AND bool_and(
            e.evtname = 'issue_pg_cron_access'
            AND e.evtowner = p.proowner
            AND e.evtevent = 'ddl_command_end'
            AND e.evtenabled = 'O'
            AND e.evttags IS NOT DISTINCT FROM ARRAY['CREATE EXTENSION']::text[]
          )
          FROM pg_catalog.pg_event_trigger e
          WHERE e.evtfoid = p.oid
        )
      ), false)
      -- END VERIFIED PLATFORM GRANT
  ) OR EXISTS (
    SELECT 1 FROM pg_depend d
    JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND r.oid = d.objid
    JOIN pg_class c ON c.oid = r.ev_class
    WHERE d.refclassid = 'pg_class'::regclass AND d.refobjid IN (v_cron_log, v_http_log)
      AND c.relkind IN ('v', 'm')
  ) THEN
    RAISE EXCEPTION 'Custom routines or views reference the logs; review consumers before cleanup';
  END IF;
  -- END LOG CONSUMER GUARD

  IF EXISTS (
    SELECT 1 FROM cron.job_run_details
    WHERE end_time IS NULL AND status IN ('starting', 'connecting', 'sending', 'running')
  ) THEN
    RAISE EXCEPTION 'Cron execution is active or has an unfinished record; inspect before retrying';
  END IF;

  -- A privileged session can see other owners' jobs. Do not reuse their names.
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = v_retention_name AND username IS DISTINCT FROM current_user
  ) THEN
    RAISE EXCEPTION 'Retention job name belongs to another owner; no changes applied';
  END IF;

  SELECT count(*) INTO v_job_count
  FROM cron.job
  WHERE jobname = v_retention_name AND username = current_user;

  IF v_job_count > 1 THEN
    RAISE EXCEPTION 'Duplicate retention jobs require review; no changes applied';
  END IF;

  IF v_job_count = 1 THEN
    SELECT jobid, command, schedule, active, database INTO v_existing
    FROM cron.job
    WHERE jobname = v_retention_name AND username = current_user;

    IF btrim(v_existing.command) IS DISTINCT FROM btrim(v_retention_command)
       OR v_existing.schedule IS DISTINCT FROM v_retention_schedule
       OR v_existing.active IS DISTINCT FROM true
       OR v_existing.database IS DISTINCT FROM current_database() THEN
      RAISE EXCEPTION 'Existing retention job differs from the approved definition; no changes applied';
    END IF;
    v_job_id := v_existing.jobid;
  ELSE
    SELECT cron.schedule(v_retention_name, v_retention_schedule, v_retention_command)
    INTO v_job_id;
  END IF;

  TRUNCATE TABLE ONLY cron.job_run_details, ONLY net._http_response CONTINUE IDENTITY RESTRICT;

  RAISE NOTICE 'Technical log cleanup complete; retention job ID: %. Commit is still required.', v_job_id;
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
