-- Fixed read-only inspection. Returns one JSON result and never emits job
-- commands, HTTP bodies, headers or tokens. Apply an execution timeout in the client.
WITH database_state AS (
SELECT current_database() AS database_name,
       now() AS inspected_at,
       current_setting('TimeZone') AS session_timezone,
       current_setting('cron.timezone', true) AS cron_timezone,
       pg_database_size(current_database()) AS database_bytes
),
extensions AS (
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net')
ORDER BY extname
),
settings AS (
SELECT name, setting, unit
FROM pg_settings
WHERE name IN ('cron.timezone', 'cron.log_run', 'pg_net.ttl', 'pg_net.batch_size')
ORDER BY name
),
relations AS (
WITH targets(schema_name, table_name) AS (
  VALUES ('cron', 'job_run_details'), ('net', '_http_response')
)
SELECT t.schema_name, t.table_name,
       c.oid IS NOT NULL AS relation_exists,
       c.relkind AS relation_kind,
       pg_get_userbyid(c.relowner) AS relation_owner,
       pg_total_relation_size(c.oid) AS total_bytes,
       pg_table_size(c.oid) AS table_bytes,
       pg_indexes_size(c.oid) AS index_bytes,
       s.n_live_tup AS estimated_live_rows,
       s.n_dead_tup AS estimated_dead_rows,
       s.last_autovacuum,
       has_table_privilege(c.oid, 'SELECT') AS can_select,
       has_table_privilege(c.oid, 'DELETE') AS can_delete,
       has_table_privilege(c.oid, 'TRUNCATE') AS can_truncate
FROM targets t
LEFT JOIN pg_namespace n ON n.nspname = t.schema_name
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = t.table_name
LEFT JOIN pg_stat_all_tables s ON s.relid = c.oid
ORDER BY t.schema_name, t.table_name
),
columns AS (
SELECT n.nspname AS schema_name, c.relname AS table_name,
       a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE a.attrelid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum
),
jobs AS (
-- Job commands may contain credentials and must not be selected.
SELECT jobid, jobname, schedule, active, database, username,
       md5(command) AS command_fingerprint
FROM cron.job
ORDER BY jobid
),
cron_statuses AS (
SELECT jobid, status, count(*) AS run_count,
       min(start_time) AS first_started_at,
       max(start_time) AS last_started_at,
       count(*) FILTER (WHERE end_time IS NULL) AS without_end_time,
       count(*) FILTER (
         WHERE status IN ('succeeded', 'failed')
           AND end_time < now() - interval '3 days'
       ) AS eligible_for_retention
FROM cron.job_run_details
GROUP BY jobid, status
ORDER BY jobid, status
),
http_statuses AS (
SELECT status_code, timed_out, error_msg IS NOT NULL AS has_error,
       count(*) AS response_count,
       min(created) AS oldest_response_at,
       max(created) AS newest_response_at,
       count(*) FILTER (WHERE created < now() - interval '3 days') AS eligible_for_retention
FROM net._http_response
GROUP BY status_code, timed_out, error_msg IS NOT NULL
ORDER BY status_code NULLS LAST, timed_out NULLS LAST, has_error
),
foreign_keys AS (
-- Foreign keys in either direction and noninternal triggers require review.
SELECT con.conname AS constraint_name,
       con.conrelid::regclass::text AS referencing_relation,
       con.confrelid::regclass::text AS referenced_relation
FROM pg_constraint con
WHERE con.contype = 'f'
  AND (con.conrelid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
       OR con.confrelid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass))
ORDER BY constraint_name
),
user_triggers AS (
SELECT tg.tgrelid::regclass::text AS relation_name, tg.tgname AS trigger_name,
       ns.nspname AS function_schema, p.proname AS function_name
FROM pg_trigger tg
JOIN pg_proc p ON p.oid = tg.tgfoid
JOIN pg_namespace ns ON ns.oid = p.pronamespace
WHERE tg.tgrelid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
  AND NOT tg.tgisinternal
ORDER BY relation_name, trigger_name
),
inheritance AS (
SELECT inhparent::regclass::text AS parent_relation,
       inhrelid::regclass::text AS child_relation
FROM pg_inherits
WHERE inhparent IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
   OR inhrelid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
),
routine_dependencies AS (
-- Report names only. Source-text matching is an additional heuristic, not a
-- complete dependency analysis for dynamically constructed SQL or external apps.
SELECT DISTINCT ns.nspname AS function_schema, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       EXISTS (
         SELECT 1 FROM pg_depend e
         JOIN pg_extension x ON x.oid = e.refobjid
         WHERE e.classid = 'pg_proc'::regclass AND e.objid = p.oid
           AND e.refclassid = 'pg_extension'::regclass AND e.deptype = 'e'
           AND x.extname IN ('pg_cron', 'pg_net')
       ) AS belongs_to_cron_or_net_extension
FROM pg_proc p
JOIN pg_namespace ns ON ns.oid = p.pronamespace
WHERE p.prokind IN ('f', 'p')
  AND (
    p.prosrc ~* '(job_run_details|_http_response)'
    OR EXISTS (
      SELECT 1 FROM pg_depend d
      WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
        AND d.refclassid = 'pg_class'::regclass
        AND d.refobjid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
    )
  )
ORDER BY function_schema, function_name, identity_arguments
),
view_dependencies AS (
SELECT DISTINCT ns.nspname AS view_schema, c.relname AS view_name, c.relkind AS view_kind
FROM pg_depend d
JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND r.oid = d.objid
JOIN pg_class c ON c.oid = r.ev_class
JOIN pg_namespace ns ON ns.oid = c.relnamespace
WHERE d.refclassid = 'pg_class'::regclass
  AND d.refobjid IN ('cron.job_run_details'::regclass, 'net._http_response'::regclass)
  AND c.relkind IN ('v', 'm')
ORDER BY view_schema, view_name
)
SELECT jsonb_build_object(
  'database', (SELECT to_jsonb(r) FROM database_state AS r),
  'extensions', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM extensions AS r), '[]'::jsonb),
  'settings', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM settings AS r), '[]'::jsonb),
  'relations', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM relations AS r), '[]'::jsonb),
  'columns', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM columns AS r), '[]'::jsonb),
  'jobs', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM jobs AS r), '[]'::jsonb),
  'cron_statuses', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM cron_statuses AS r), '[]'::jsonb),
  'http_statuses', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM http_statuses AS r), '[]'::jsonb),
  'foreign_keys', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM foreign_keys AS r), '[]'::jsonb),
  'user_triggers', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM user_triggers AS r), '[]'::jsonb),
  'inheritance', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM inheritance AS r), '[]'::jsonb),
  'routine_dependencies', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM routine_dependencies AS r), '[]'::jsonb),
  'view_dependencies', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM view_dependencies AS r), '[]'::jsonb)
) AS inspection;
