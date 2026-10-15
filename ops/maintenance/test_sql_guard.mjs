import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Install the optional PostgreSQL test runtime outside the application tree:
// npm install --prefix /tmp/i9-maintenance-test-runtime --no-save @electric-sql/pglite@0.5.10
// PGLITE_MODULE_PATH=/tmp/i9-maintenance-test-runtime/node_modules/@electric-sql/pglite/dist/index.js \
//   node ops/maintenance/test_sql_guard.mjs
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const source = await readFile(new URL('./cleanup_internal_logs.sql', import.meta.url), 'utf8');
const inspection = await readFile(new URL('./inspect_log_consumers.sql', import.meta.url), 'utf8');
const officialBody = await readFile(
  new URL('./fixtures/grant_pg_cron_access.sql.txt', import.meta.url), 'utf8',
);
const guard = source.split('-- BEGIN LOG CONSUMER GUARD')[1]?.split('-- END LOG CONSUMER GUARD')[0];
assert.ok(guard?.trim(), 'The regression test must execute the actual production guard');
assert.equal(source.split('-- BEGIN LOG CONSUMER GUARD').length, 2);
assert.equal(source.split('-- END LOG CONSUMER GUARD').length, 2);
const platformPredicate = (sql) => sql.split('-- BEGIN VERIFIED PLATFORM GRANT')[1]
  ?.split('-- END VERIFIED PLATFORM GRANT')[0].trim();
assert.ok(platformPredicate(source));
assert.equal(platformPredicate(source), platformPredicate(inspection),
  'read-only inspection must use the same allow predicate as maintenance');
const normalizeBody = (body) => body.replaceAll('\r\n', '\n').replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
assert.equal(createHash('sha256').update(normalizeBody(officialBody)).digest('hex'),
  'ccca00e6a47ee295704efda0585689cbb1802071c64adfd62b39879cf1f383a2');

const db = new PGlite();
const guardSql = `DO $test_guard$
DECLARE
  v_cron_log oid := 'cron.job_run_details'::regclass;
  v_http_log oid := 'net._http_response'::regclass;
BEGIN
${guard}
END
$test_guard$;`;
const quote = (value) => `"${value.replaceAll('"', '""')}"`;
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
let passed = 0;

async function installOfficial({ body = officialBody, owner = 'supabase_admin',
  schema = 'extensions', name = 'grant_pg_cron_access', args = '', returns = 'event_trigger',
  attributes = '', event = true, eventName = 'issue_pg_cron_access',
  eventOwner = 'supabase_admin', eventPhase = 'ddl_command_end',
  eventTags = ['CREATE EXTENSION'] } = {}) {
  const fn = `${quote(schema)}.${quote(name)}`;
  await db.exec(`CREATE FUNCTION ${fn}(${args}) RETURNS ${returns}
    LANGUAGE plpgsql ${attributes} AS ${literal(body)};
    ALTER FUNCTION ${fn}(${args}) OWNER TO ${quote(owner)};`);
  if (event) {
    await db.exec(`CREATE EVENT TRIGGER ${quote(eventName)} ON ${eventPhase}
      ${eventTags === null ? '' : `WHEN TAG IN (${eventTags.map(literal).join(', ')})`}
      EXECUTE FUNCTION ${fn}();
      ALTER EVENT TRIGGER ${quote(eventName)} OWNER TO ${quote(eventOwner)};`);
  }
}

async function exercise(name, setup, blocked = false) {
  await db.exec('BEGIN');
  try {
    await setup();
    const { rows: [{ consumer_inspection: report }] } = await db.query(inspection);
    assert.equal(report.targets_present, true);
    assert.equal(report.blocking_routines.length + report.blocking_views.length > 0, blocked,
      `${name}: inspection must agree with the executable guard`);
    if (blocked) {
      await assert.rejects(db.exec(guardSql), (error) => {
        assert.equal(error.code, 'P0001', `${name}: expected the consumer safety exception`);
        assert.match(error.message, /Custom routines or views reference the logs/);
        return true;
      });
    } else {
      await db.exec(guardSql);
    }
    passed += 1;
    console.log(`ok ${passed} - ${name}`);
  } finally {
    await db.exec('ROLLBACK');
  }
}

try {
  await db.exec(`CREATE ROLE supabase_admin SUPERUSER;
    CREATE ROLE inspection_reader;
    CREATE SCHEMA extensions;
    CREATE SCHEMA cron;
    CREATE SCHEMA net;
    CREATE TABLE cron.job_run_details (runid bigint, status text, end_time timestamptz);
    CREATE TABLE net._http_response (id bigint, status_code integer, created timestamptz);
    INSERT INTO cron.job_run_details VALUES (1, 'succeeded', now());
    INSERT INTO net._http_response VALUES (1, 200, now());
    GRANT USAGE ON SCHEMA cron, net, extensions TO inspection_reader;`);

  await exercise('no application consumers is allowed', async () => {});
  await exercise('official function with exact metadata and event binding is allowed', installOfficial);
  await exercise('CRLF and surrounding whitespace normalize to the official source', () =>
    installOfficial({ body: ` \t\r\n${officialBody.replaceAll('\n', '\r\n')}\r\n\t ` }));
  await exercise('same name with modified body is blocked', () =>
    installOfficial({ body: officialBody.replace('BEGIN', 'BEGIN\n  PERFORM 1;') }), true);
  await exercise('internal source whitespace drift is blocked', () =>
    installOfficial({ body: officialBody.replace('grant usage', 'grant  usage') }), true);
  await exercise('same body under another owner is blocked', () =>
    installOfficial({ owner: 'postgres' }), true);
  await exercise('same body in another schema is blocked', () =>
    installOfficial({ schema: 'public' }), true);
  await exercise('same body with another function name is blocked', () =>
    installOfficial({ name: 'other_grant_pg_cron_access' }), true);
  await exercise('wrong return type is blocked', () =>
    installOfficial({ returns: 'void', event: false }), true);
  await exercise('overloaded function signature is blocked', () =>
    installOfficial({ args: 'integer', returns: 'void', event: false }), true);
  await exercise('an approved zero-argument helper does not hide an unapproved overload', async () => {
    await installOfficial();
    await installOfficial({ args: 'integer', returns: 'void', event: false });
  }, true);
  await exercise('SECURITY DEFINER drift is blocked', () =>
    installOfficial({ attributes: 'SECURITY DEFINER' }), true);
  await exercise('function search_path configuration drift is blocked', () =>
    installOfficial({ attributes: 'SET search_path = pg_catalog' }), true);
  await exercise('STRICT drift is blocked', () =>
    installOfficial({ attributes: 'STRICT' }), true);
  await exercise('LEAKPROOF drift is blocked', () =>
    installOfficial({ attributes: 'LEAKPROOF' }), true);
  await exercise('volatility drift is blocked', () =>
    installOfficial({ attributes: 'STABLE' }), true);
  await exercise('parallel safety drift is blocked', () =>
    installOfficial({ attributes: 'PARALLEL SAFE' }), true);
  await exercise('missing event binding is blocked', () =>
    installOfficial({ event: false }), true);
  await exercise('wrong event trigger name is blocked', () =>
    installOfficial({ eventName: 'other_cron_access' }), true);
  await exercise('wrong event trigger owner is blocked', () =>
    installOfficial({ eventOwner: 'postgres' }), true);
  await exercise('wrong event phase is blocked', () =>
    installOfficial({ eventPhase: 'ddl_command_start' }), true);
  await exercise('wrong event tags are blocked', () =>
    installOfficial({ eventTags: ['ALTER TABLE'] }), true);
  await exercise('additional event tags are blocked', () =>
    installOfficial({ eventTags: ['CREATE EXTENSION', 'ALTER TABLE'] }), true);
  await exercise('unrestricted NULL event tags are blocked', () =>
    installOfficial({ eventTags: null }), true);
  await exercise('disabled event trigger is blocked', async () => {
    await installOfficial();
    await db.exec('ALTER EVENT TRIGGER issue_pg_cron_access DISABLE');
  }, true);
  await exercise('ALWAYS-enabled event trigger drift is blocked', async () => {
    await installOfficial();
    await db.exec('ALTER EVENT TRIGGER issue_pg_cron_access ENABLE ALWAYS');
  }, true);
  await exercise('second binding of the official function is blocked', async () => {
    await installOfficial();
    await db.exec(`CREATE EVENT TRIGGER extra_cron_access ON ddl_command_end
      WHEN TAG IN ('CREATE EXTENSION') EXECUTE FUNCTION extensions.grant_pg_cron_access();`);
  }, true);
  await exercise('official helper does not hide a custom cron consumer', async () => {
    await installOfficial();
    await db.exec(`CREATE FUNCTION public.read_cron() RETURNS bigint LANGUAGE sql AS
      'SELECT count(*) FROM cron.job_run_details';`);
  }, true);
  await exercise('official helper does not hide a custom HTTP consumer', async () => {
    await installOfficial();
    await db.exec(`CREATE FUNCTION public.read_http() RETURNS bigint LANGUAGE sql AS
      'SELECT count(*) FROM net._http_response';`);
  }, true);
  await exercise('catalog-dependent function remains blocked without textual table name', async () => {
    await installOfficial();
    await db.exec(`CREATE FUNCTION public.read_cron_compiled() RETURNS bigint LANGUAGE sql
      BEGIN ATOMIC SELECT count(*) FROM cron.job_run_details; END;`);
    const { rows: [fn] } = await db.query(`SELECT prosrc FROM pg_proc
      WHERE oid = 'public.read_cron_compiled()'::regprocedure`);
    assert.doesNotMatch(fn.prosrc, /job_run_details|_http_response/i);
  }, true);
  await exercise('custom stored procedure referencing logs remains blocked', async () => {
    await installOfficial();
    await db.exec(`CREATE PROCEDURE public.read_cron_procedure() LANGUAGE plpgsql AS
      'BEGIN PERFORM 1 FROM cron.job_run_details; END;';`);
  }, true);
  await exercise('view consuming cron logs remains blocked', async () => {
    await installOfficial();
    await db.exec('CREATE VIEW public.cron_consumer AS SELECT * FROM cron.job_run_details');
  }, true);
  await exercise('materialized view consuming HTTP logs remains blocked', async () => {
    await installOfficial();
    await db.exec('CREATE MATERIALIZED VIEW public.http_consumer AS SELECT * FROM net._http_response');
  }, true);

  await installOfficial();
  await db.exec('BEGIN READ ONLY');
  try {
    await db.exec(guardSql);
    const results = await db.exec(inspection);
    assert.ok(results.length > 0);
    assert.ok(results.every((result) => result.affectedRows === undefined || result.affectedRows === 0));
    assert.doesNotMatch(JSON.stringify(results), /grant usage on schema cron/i,
      'inspection must not return function bodies');
    const { rows: [flags] } = await db.query('SHOW transaction_read_only');
    assert.equal(flags.transaction_read_only, 'on');
    const { rows: [counts] } = await db.query(`SELECT
      (SELECT count(*) FROM cron.job_run_details)::int AS cron_rows,
      (SELECT count(*) FROM net._http_response)::int AS http_rows`);
    assert.deepEqual(counts, { cron_rows: 1, http_rows: 1 });
    passed += 1;
    console.log(`ok ${passed} - guard and metadata inspection run read-only and preserve log rows`);
  } finally {
    await db.exec('ROLLBACK');
  }
  await db.exec('BEGIN READ ONLY; SET LOCAL ROLE inspection_reader');
  try {
    const { rows: [{ consumer_inspection: report }] } = await db.query(inspection);
    assert.equal(report.blocking_routines.length, 0);
    assert.equal(report.routine_dependencies.length, 1);
    assert.equal(report.routine_dependencies[0].recognized_platform_grant, true);
    await assert.rejects(db.query('SELECT * FROM cron.job_run_details'),
      (error) => error.code === '42501');
    passed += 1;
    console.log(`ok ${passed} - catalog inspection succeeds without SELECT access to log rows`);
  } finally {
    await db.exec('ROLLBACK');
  }
  console.log(`1..${passed}`);
  console.log('Test runtime: PostgreSQL in PGlite; pg_cron/pg_net execution and production cleanup are not exercised.');
} finally {
  await db.close();
}
