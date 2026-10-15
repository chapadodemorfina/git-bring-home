-- Read-only catalog inspection; does not scan log rows or emit routine bodies.
-- A match is reviewed platform DDL, not permission to skip other cleanup guards.
WITH routine_dependencies AS (
  SELECT p.oid, ns.nspname AS function_schema, p.proname AS function_name,
         pg_get_function_identity_arguments(p.oid) AS identity_arguments,
         pg_get_userbyid(p.proowner) AS owner,
         p.prorettype::regtype::text AS return_type,
         l.lanname AS language,
         pg_catalog.encode(
           pg_catalog.sha256(
             pg_catalog.convert_to(
               pg_catalog.btrim(
                 pg_catalog.replace(p.prosrc, E'\r\n', E'\n'), E' \t\r\n'
               ), 'UTF8'
             )
           ), 'hex'
         ) AS source_sha256,
         EXISTS (
           SELECT 1 FROM pg_depend d JOIN pg_extension x ON x.oid = d.refobjid
           WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
             AND d.refclassid = 'pg_extension'::regclass AND d.deptype = 'e'
             AND x.extname IN ('pg_cron', 'pg_net')
         ) AS belongs_to_cron_or_net_extension,
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
         AS recognized_platform_grant,
         (
           SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'name', e.evtname, 'event', e.evtevent,
             'owner', pg_get_userbyid(e.evtowner),
             'enabled', e.evtenabled, 'tags', e.evttags
           ) ORDER BY e.evtname), '[]'::jsonb)
           FROM pg_event_trigger e WHERE e.evtfoid = p.oid
         ) AS event_triggers
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE p.prokind IN ('f', 'p')
    AND (
      p.prosrc ~* '(job_run_details|_http_response)'
      OR EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
          AND d.refclassid = 'pg_class'::regclass
          AND d.refobjid IN (
            to_regclass('cron.job_run_details'), to_regclass('net._http_response')
          )
      )
    )
),
view_dependencies AS (
  SELECT DISTINCT ns.nspname AS view_schema, c.relname AS view_name,
         c.relkind AS view_kind
  FROM pg_depend d
  JOIN pg_rewrite r ON d.classid = 'pg_rewrite'::regclass AND r.oid = d.objid
  JOIN pg_class c ON c.oid = r.ev_class
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE d.refclassid = 'pg_class'::regclass
    AND d.refobjid IN (
      to_regclass('cron.job_run_details'), to_regclass('net._http_response')
    )
    AND c.relkind IN ('v', 'm')
)
SELECT jsonb_build_object(
  'inspected_at', now(),
  'database', current_database(),
  'targets_present', to_regclass('cron.job_run_details') IS NOT NULL
                     AND to_regclass('net._http_response') IS NOT NULL,
  'routine_dependencies', COALESCE((
    SELECT jsonb_agg(to_jsonb(r) ORDER BY function_schema, function_name, identity_arguments)
    FROM routine_dependencies r
  ), '[]'::jsonb),
  'blocking_routines', COALESCE((
    SELECT jsonb_agg(to_jsonb(r) ORDER BY function_schema, function_name, identity_arguments)
    FROM routine_dependencies r
    WHERE NOT belongs_to_cron_or_net_extension AND NOT recognized_platform_grant
  ), '[]'::jsonb),
  'blocking_views', COALESCE((
    SELECT jsonb_agg(to_jsonb(v) ORDER BY view_schema, view_name)
    FROM view_dependencies v
  ), '[]'::jsonb)
) AS consumer_inspection;
