-- Read-only metadata inspection; no log rows, routine bodies or job commands.
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
)
SELECT jsonb_build_object(
  'database', (SELECT to_jsonb(r) FROM database_state AS r),
  'extensions', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM extensions AS r), '[]'::jsonb),
  'settings', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM settings AS r), '[]'::jsonb),
  'relations', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM relations AS r), '[]'::jsonb),
  'columns', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM columns AS r), '[]'::jsonb),
  'jobs', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM jobs AS r), '[]'::jsonb)
) AS inspection;
