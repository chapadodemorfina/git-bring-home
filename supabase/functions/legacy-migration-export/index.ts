import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPORTER_VERSION = "2026-08-31.1";
const EXPORT_BUCKET = "migration-i9-export";
const MAX_PAGE_SIZE = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SENSITIVE_KEY_PATTERNS = [
  /(^|_)password($|_)/i,
  /(^|_)passwd($|_)/i,
  /(^|_)secret($|_)/i,
  /service_role/i,
  /private_key/i,
  /access_token/i,
  /refresh_token/i,
  /api_key/i,
  /apikey/i,
  /client_secret/i,
  /verify_token/i,
  /verification_token/i,
  /signing_key/i,
  /signing_secret/i,
  /webhook_secret/i,
  /smtp_password/i,
  /database_url/i,
  /db_password/i,
  /jwt_secret/i,
  /encryption_key/i,
  /^authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
];

const BLOCKED_TABLE_PATTERNS = [
  /credential/i,
  /secret/i,
  /vault/i,
];

type JsonObject = Record<string, unknown>;

type TableInventory = {
  name: string;
  tenant_scoped: boolean;
  blocked: boolean;
  blocked_reason: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redact(value: unknown, key = ""): unknown {
  if (key && isSensitiveKey(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    const result: JsonObject = {};
    for (const [childKey, childValue] of Object.entries(value as JsonObject)) {
      result[childKey] = redact(childValue, childKey);
    }
    return result;
  }
  return value;
}

function tableBlockedReason(table: string): string | null {
  if (BLOCKED_TABLE_PATTERNS.some((pattern) => pattern.test(table))) {
    return "security_sensitive_table";
  }
  return null;
}

async function sha256Hex(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeRunId(value: unknown): string {
  const runId = String(value ?? "");
  if (!/^[a-zA-Z0-9._-]{8,120}$/.test(runId)) throw new Error("invalid_run_id");
  return runId;
}

function safeTableName(value: unknown): string {
  const table = String(value ?? "");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(table)) throw new Error("invalid_table");
  return table;
}

function safeBucketName(value: unknown): string {
  const bucket = String(value ?? "");
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(bucket)) throw new Error("invalid_bucket");
  return bucket;
}

function safePrefix(value: unknown): string {
  const prefix = String(value ?? "");
  if (prefix.includes("..") || prefix.startsWith("/")) throw new Error("invalid_prefix");
  return prefix.replace(/^\/+|\/+$/g, "");
}

async function ensureExportBucket(admin: any) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw new Error(`storage_list_failed:${listError.message}`);
  if ((buckets ?? []).some((bucket: any) => bucket.name === EXPORT_BUCKET)) return;
  const { error } = await admin.storage.createBucket(EXPORT_BUCKET, { public: false });
  if (error && !String(error.message).toLowerCase().includes("already")) {
    throw new Error(`storage_bucket_failed:${error.message}`);
  }
}

async function uploadJson(admin: any, path: string, value: unknown) {
  const raw = JSON.stringify(value);
  const checksum = await sha256Hex(raw);
  const { error } = await admin.storage
    .from(EXPORT_BUCKET)
    .upload(path, new Blob([raw], { type: "application/json" }), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw new Error(`storage_upload_failed:${error.message}`);
  return { path, checksum_sha256: checksum, bytes: new TextEncoder().encode(raw).byteLength };
}

async function downloadJson(admin: any, path: string) {
  const { data, error } = await admin.storage.from(EXPORT_BUCKET).download(path);
  if (error || !data) throw new Error(`storage_download_failed:${error?.message ?? "missing"}`);
  return JSON.parse(await data.text());
}

async function getPublicInventory(supabaseUrl: string, serviceRoleKey: string): Promise<TableInventory[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/openapi+json",
    },
  });
  if (!response.ok) throw new Error(`openapi_failed:${response.status}`);
  const openapi = await response.json();
  const definitions = openapi.definitions ?? openapi.components?.schemas ?? {};
  const tableNames = Object.keys(openapi.paths ?? {})
    .filter((path) => path.startsWith("/") && !path.startsWith("/rpc/") && path.slice(1).indexOf("/") === -1)
    .map((path) => path.slice(1))
    .filter(Boolean)
    .sort();

  return tableNames.map((name) => {
    const properties = definitions?.[name]?.properties ?? {};
    const blockedReason = tableBlockedReason(name);
    return {
      name,
      tenant_scoped: Object.prototype.hasOwnProperty.call(properties, "tenant_id"),
      blocked: Boolean(blockedReason),
      blocked_reason: blockedReason,
    };
  });
}

async function getTenantCount(admin: any) {
  const { count, error } = await admin.from("tenants").select("id", { count: "exact", head: true });
  if (error) throw new Error(`tenant_count_failed:${error.message}`);
  return count ?? 0;
}

async function authorize(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("missing_server_configuration");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "unauthorized" }, 401) } as const;
  }
  const jwt = authHeader.slice("Bearer ".length).trim();
  const tenantId = req.headers.get("x-tenant-id")?.trim();
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
    return { error: jsonResponse({ error: "tenant_required" }, 400) } as const;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) {
    return { error: jsonResponse({ error: "invalid_user_token" }, 401) } as const;
  }

  const { data: tenantLink, error: tenantError } = await admin
    .from("tenant_users")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (tenantError || !tenantLink) {
    return { error: jsonResponse({ error: "tenant_access_denied" }, 403) } as const;
  }

  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id);
  if (roleError) return { error: jsonResponse({ error: "role_check_failed" }, 500) } as const;
  const roleNames = (roles ?? []).map((row: any) => String(row.role));
  if (!roleNames.includes("admin")) {
    return { error: jsonResponse({ error: "admin_required" }, 403) } as const;
  }

  return { admin, supabaseUrl, serviceRoleKey, tenantId, user } as const;
}

async function scopedTablePage(
  admin: any,
  inventory: TableInventory[],
  table: string,
  tenantId: string,
  tenantCount: number,
  offset: number,
  limit: number,
) {
  const tableInfo = inventory.find((item) => item.name === table);
  if (!tableInfo) throw new Error("table_not_exposed");
  if (tableInfo.blocked) throw new Error(`blocked_table:${tableInfo.blocked_reason}`);

  let query = admin.from(table).select("*", { count: "exact" });

  if (table === "tenants") {
    query = query.eq("id", tenantId);
  } else if (table === "profiles") {
    const { data: links, error: linkError } = await admin
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenantId);
    if (linkError) throw new Error(`profile_scope_failed:${linkError.message}`);
    const ids = [...new Set((links ?? []).map((row: any) => row.user_id).filter(Boolean))];
    if (ids.length === 0) return { rows: [], count: 0 };
    query = query.in("id", ids);
  } else if (tableInfo.tenant_scoped) {
    query = query.eq("tenant_id", tenantId);
  } else if (tenantCount !== 1) {
    throw new Error("unscoped_table_requires_manual_review");
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(`table_export_failed:${error.message}`);
  return { rows: (data ?? []).map((row: unknown) => redact(row)), count: count ?? 0 };
}

async function snapshotAuthUsers(admin: any, tenantId: string, runId: string) {
  const { data: links, error: linkError } = await admin
    .from("tenant_users")
    .select("user_id")
    .eq("tenant_id", tenantId);
  if (linkError) throw new Error(`auth_scope_failed:${linkError.message}`);
  const wanted = new Set((links ?? []).map((row: any) => String(row.user_id)));
  const exported: unknown[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth_users_failed:${error.message}`);
    const users = data?.users ?? [];
    for (const user of users) {
      if (!wanted.has(user.id)) continue;
      exported.push(redact({
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        created_at: user.created_at ?? null,
        updated_at: user.updated_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        phone_confirmed_at: user.phone_confirmed_at ?? null,
        banned_until: user.banned_until ?? null,
        app_metadata: user.app_metadata ?? {},
        user_metadata: user.user_metadata ?? {},
      }));
    }
    if (users.length < 1000) break;
    page += 1;
  }

  return await uploadJson(admin, `${runId}/auth/users.sanitized.json`, {
    exporter_version: EXPORTER_VERSION,
    tenant_id: tenantId,
    count: exported.length,
    users: exported,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const authorization = await authorize(req);
    if ("error" in authorization) return authorization.error;
    const { admin, supabaseUrl, serviceRoleKey, tenantId, user } = authorization;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const tenantCount = await getTenantCount(admin);

    switch (action) {
      case "start": {
        await ensureExportBucket(admin);
        const inventory = await getPublicInventory(supabaseUrl, serviceRoleKey);
        const runId = `i9-${tenantId.slice(0, 8)}-${new Date().toISOString().replace(/[^0-9TZ]/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
        const startManifest = {
          exporter_version: EXPORTER_VERSION,
          run_id: runId,
          source_project_ref: "moijoyqwapimforpijdc",
          tenant_id: tenantId,
          tenant_count: tenantCount,
          initiated_by: user.id,
          started_at: new Date().toISOString(),
          export_bucket: EXPORT_BUCKET,
          default_page_size: 250,
          tables: inventory,
          security: {
            business_tables_read_only: true,
            secrets_redacted: true,
            security_sensitive_tables_blocked: true,
            auth_passwords_or_tokens_exported: false,
          },
        };
        const stored = await uploadJson(admin, `${runId}/manifest-start.json`, startManifest);
        return jsonResponse({ ...startManifest, manifest_start: stored });
      }

      case "snapshot_table": {
        await ensureExportBucket(admin);
        const runId = safeRunId(body?.run_id);
        const table = safeTableName(body?.table);
        const offset = Math.max(0, Number.parseInt(String(body?.offset ?? "0"), 10) || 0);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(String(body?.limit ?? "250"), 10) || 250));
        const inventory = await getPublicInventory(supabaseUrl, serviceRoleKey);
        const { rows, count } = await scopedTablePage(admin, inventory, table, tenantId, tenantCount, offset, limit);
        const nextOffset = offset + rows.length < count ? offset + rows.length : null;
        const payload = {
          exporter_version: EXPORTER_VERSION,
          run_id: runId,
          tenant_id: tenantId,
          table,
          offset,
          limit,
          page_count: rows.length,
          total_count: count,
          next_offset: nextOffset,
          exported_at: new Date().toISOString(),
          rows,
        };
        const stored = await uploadJson(admin, `${runId}/tables/${table}/${String(offset).padStart(12, "0")}.json`, payload);
        return jsonResponse({ table, offset, page_count: rows.length, total_count: count, next_offset: nextOffset, stored });
      }

      case "snapshot_auth_users": {
        await ensureExportBucket(admin);
        const runId = safeRunId(body?.run_id);
        const stored = await snapshotAuthUsers(admin, tenantId, runId);
        return jsonResponse({ success: true, stored });
      }

      case "list_storage_buckets": {
        if (tenantCount !== 1) return jsonResponse({ error: "storage_requires_manual_review_for_multi_tenant_project" }, 409);
        const { data, error } = await admin.storage.listBuckets();
        if (error) throw new Error(`storage_list_failed:${error.message}`);
        const buckets = (data ?? [])
          .filter((bucket: any) => bucket.name !== EXPORT_BUCKET)
          .map((bucket: any) => redact({
            id: bucket.id,
            name: bucket.name,
            public: bucket.public,
            file_size_limit: bucket.file_size_limit ?? null,
            allowed_mime_types: bucket.allowed_mime_types ?? null,
            created_at: bucket.created_at ?? null,
            updated_at: bucket.updated_at ?? null,
          }));
        return jsonResponse({ buckets });
      }

      case "snapshot_storage_index": {
        if (tenantCount !== 1) return jsonResponse({ error: "storage_requires_manual_review_for_multi_tenant_project" }, 409);
        await ensureExportBucket(admin);
        const runId = safeRunId(body?.run_id);
        const bucket = safeBucketName(body?.bucket);
        if (bucket === EXPORT_BUCKET) return jsonResponse({ error: "cannot_index_export_bucket" }, 400);
        const prefix = safePrefix(body?.prefix ?? "");
        const offset = Math.max(0, Number.parseInt(String(body?.offset ?? "0"), 10) || 0);
        const limit = Math.min(1000, Math.max(1, Number.parseInt(String(body?.limit ?? "1000"), 10) || 1000));
        const { data, error } = await admin.storage.from(bucket).list(prefix, {
          limit,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw new Error(`storage_index_failed:${error.message}`);
        const entries = (data ?? []).map((entry: any) => redact(entry));
        const prefixKey = prefix ? prefix.replace(/[^a-zA-Z0-9._-]+/g, "__") : "__root__";
        const stored = await uploadJson(
          admin,
          `${runId}/storage-index/${bucket}/${prefixKey}/${String(offset).padStart(12, "0")}.json`,
          { bucket, prefix, offset, limit, page_count: entries.length, entries },
        );
        return jsonResponse({ bucket, prefix, offset, page_count: entries.length, has_more: entries.length === limit, entries, stored });
      }

      case "create_storage_read_url": {
        if (tenantCount !== 1) return jsonResponse({ error: "storage_requires_manual_review_for_multi_tenant_project" }, 409);
        const bucket = safeBucketName(body?.bucket);
        const path = safePrefix(body?.path);
        if (!path) return jsonResponse({ error: "path_required" }, 400);
        const expiresIn = Math.min(900, Math.max(60, Number.parseInt(String(body?.expires_in ?? "300"), 10) || 300));
        const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
        if (error || !data?.signedUrl) throw new Error(`signed_url_failed:${error?.message ?? "missing"}`);
        return jsonResponse({ bucket, path, expires_in: expiresIn, signed_url: data.signedUrl });
      }

      case "finalize": {
        await ensureExportBucket(admin);
        const runId = safeRunId(body?.run_id);
        const start = await downloadJson(admin, `${runId}/manifest-start.json`);
        if (start.tenant_id !== tenantId) return jsonResponse({ error: "run_tenant_mismatch" }, 403);
        const tableFiles: Record<string, string[]> = {};
        for (const tableInfo of start.tables as TableInventory[]) {
          if (tableInfo.blocked) continue;
          const { data, error } = await admin.storage.from(EXPORT_BUCKET).list(`${runId}/tables/${tableInfo.name}`, {
            limit: 1000,
            sortBy: { column: "name", order: "asc" },
          });
          if (error) throw new Error(`manifest_list_failed:${tableInfo.name}:${error.message}`);
          tableFiles[tableInfo.name] = (data ?? []).filter((item: any) => item.id).map((item: any) => `${runId}/tables/${tableInfo.name}/${item.name}`);
        }
        const manifest = {
          ...start,
          finalized_at: new Date().toISOString(),
          table_files: tableFiles,
          auth_users_path: `${runId}/auth/users.sanitized.json`,
          note: "Storage binaries are not embedded in table pages. Use storage-index plus short-lived signed URLs to copy objects before retiring the legacy Supabase project.",
        };
        const stored = await uploadJson(admin, `${runId}/manifest.json`, manifest);
        const { data: signed, error: signedError } = await admin.storage.from(EXPORT_BUCKET).createSignedUrl(`${runId}/manifest.json`, 900);
        if (signedError || !signed?.signedUrl) throw new Error(`manifest_signed_url_failed:${signedError?.message ?? "missing"}`);
        return jsonResponse({ success: true, run_id: runId, manifest: stored, signed_manifest_url: signed.signedUrl, expires_in: 900 });
      }

      default:
        return jsonResponse({ error: "invalid_action" }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
