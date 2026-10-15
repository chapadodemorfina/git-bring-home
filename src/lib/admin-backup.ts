import { zipSync, strToU8 } from "fflate";
import { supabase, getActiveTenantId } from "@/integrations/supabase/client";
import {
  BACKUP_TABLES, BACKUP_SOURCE_PROJECT, BACKUP_FORMAT_VERSION, BACKUP_PAGE_SIZE,
  BACKUP_RAW_LIMIT, BACKUP_FILE_LIMIT, BACKUP_ROLES, BACKUP_EXCLUSIONS,
  SAFE_SETTING_KEYS, type BackupTableDefinition,
} from "./admin-backup-manifest";

type Row = Record<string, unknown>;
interface ReadResult<T> { data: T | null; error: unknown; count?: number | null }
/** Minimal read-only PostgREST surface for the reviewed, heterogeneous table manifest. */
interface BackupQuery<T> extends PromiseLike<ReadResult<T>> {
  select(columns: string, options?: { count: "exact"; head: boolean }): BackupQuery<Row[]>;
  eq(column: string, value: unknown): BackupQuery<T>;
  in(column: string, values: readonly string[]): BackupQuery<T>;
  gt(column: string, value: string): BackupQuery<T>;
  order(column: string, options: { ascending: boolean }): BackupQuery<T>;
  limit(count: number): BackupQuery<T>;
  abortSignal(signal: AbortSignal): BackupQuery<T>;
  maybeSingle(): BackupQuery<Row>;
}
interface BackupReadClient {
  from(table: string): BackupQuery<Row[]>;
  rpc(name: "get_active_tenant_id"): BackupQuery<unknown>;
}
export interface BackupProgress { message: string; completed: number; total: number }
export interface AdminBackupOptions {
  tenantId: string;
  userId: string;
  signal?: AbortSignal;
  onProgress?: (progress: BackupProgress) => void;
}
export interface BackupSummary {
  status: "completed" | "partial";
  rowCount: number;
  tableCount: number;
  issues: string[];
}
interface FileRecord { path: string; bytes: number; sha256: string; rows?: number }
interface TableRecord {
  name: string; completed: boolean; rows: number; files: string[];
  countBefore: number; countAfter: number;
}
interface AttachmentReference { bucket: "device-photos" | "service-order-attachments"; path: string; parent: string }

export class BackupStoppedError extends Error {}
class BackupReadError extends Error {}

/** Bound every read even when an SDK helper does not expose cancellation. */
export async function backupRead<T>(operation: (signal: AbortSignal) => PromiseLike<T>, outer?: AbortSignal): Promise<T> {
  checkBackupAbort(outer);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  outer?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, 30_000);
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation(controller.signal)),
      new Promise<never>((_, reject) => {
        onAbort = () => reject(outer?.aborted
          ? new BackupStoppedError("Exportação cancelada. Nenhum arquivo final foi gerado.")
          : new BackupReadError("Tempo de leitura excedido; conteúdo não confirmado."));
        controller.signal.addEventListener("abort", onAbort, { once: true });
        if (controller.signal.aborted) onAbort();
      }),
    ]);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", cancel);
    if (onAbort) controller.signal.removeEventListener("abort", onAbort);
  }
}

export function checkBackupAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new BackupStoppedError("Exportação cancelada. Nenhum arquivo final foi gerado.");
}

const sensitiveKey = /(^|_)(password|passwd|pwd|pin|secret|credential|credentials|token|access_token|refresh_token|api_key|apikey|private_key|public_token|authorization|cookie|set-cookie|database_url|db_password|jwt_secret|encryption_key|signing_key|signing_secret|webhook_secret|smtp_password)($|_)/i;
const tokenValue = /\b(?:Bearer\s+[^\s"'<>]+|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+)\b/gi;
const isSensitive = (key: string) => sensitiveKey.test(key.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/-/g, "_"));

/** Handles both ordinary object keys and settings stored as {key, value}. */
export function redactBackupValue(value: unknown, key = ""): unknown {
  if (key && isSensitive(key)) return "[REDACTED]";
  if (typeof value === "string") return value.replace(tokenValue, "[REDACTED]")
    .replace(/([?&](?:token|access_token|api_key|apikey|signature|secret)=)[^&\s"'<>]*/gi, "$1[REDACTED]");
  if (Array.isArray(value)) return value.map((item) => redactBackupValue(item));
  if (value && typeof value === "object") {
    const object = value as Row;
    const contextualKey = [object.key, object.setting_key, object.name].find((item) => typeof item === "string" && isSensitive(item));
    return Object.fromEntries(Object.entries(object).map(([childKey, childValue]) => [
      childKey,
      contextualKey && /^(value|old_value|new_value)$/i.test(childKey)
        ? "[REDACTED]" : redactBackupValue(childValue, childKey),
    ]));
  }
  return value;
}

export function validateBackupRows(rows: Row[], table: BackupTableDefinition, tenantId: string, profileIds: Set<string>) {
  for (const row of rows) {
    const scoped = table.scope === "tenant" ? row.tenant_id === tenantId
      : table.scope === "tenant-record" ? row.id === tenantId
        : typeof row.id === "string" && profileIds.has(row.id);
    if (!scoped) throw new BackupStoppedError("A resposta não corresponde à empresa selecionada. Exportação interrompida.");
  }
}

/** Empty pages terminate traversal; a short server-capped page does not. */
export async function readBackupPages(input: {
  cursorKey: string;
  readPage: (cursor: string | null) => Promise<Row[]>;
  onPage: (rows: Row[]) => Promise<void>;
  signal?: AbortSignal;
}) {
  let cursor: string | null = null;
  let rowCount = 0;
  const cursors = new Set<string>();
  while (true) {
    checkBackupAbort(input.signal);
    const rows = await input.readPage(cursor);
    checkBackupAbort(input.signal);
    if (!Array.isArray(rows)) throw new BackupReadError("Resposta de tabela inválida.");
    if (rows.length === 0) break;
    const keys = rows.map((row) => row[input.cursorKey]);
    if (keys.some((key) => typeof key !== "string" || !key || cursors.has(key)) || new Set(keys).size !== keys.length) {
      throw new BackupReadError("Paginação inconsistente ou identificador ausente.");
    }
    keys.forEach((key) => cursors.add(key as string));
    cursor = keys[keys.length - 1] as string;
    await input.onPage(rows);
    rowCount += rows.length;
  }
  return rowCount;
}

export function backupAttachmentReferences(table: string, rows: Row[], onInvalid?: () => void): AttachmentReference[] {
  const output: AttachmentReference[] = [];
  for (const row of rows) {
    let bucket: AttachmentReference["bucket"];
    let parent: unknown;
    let path: unknown;
    if (table === "device_photos") {
      bucket = "device-photos"; parent = row.device_id; path = row.storage_path;
    } else if (table === "service_order_attachments") {
      bucket = "service-order-attachments"; parent = row.service_order_id; path = row.storage_path;
    } else if (table === "pickups_deliveries" && row.proof_storage_path) {
      bucket = "service-order-attachments"; parent = `logistics/${row.id}`; path = row.proof_storage_path;
    } else continue;
    if (typeof parent !== "string" || typeof path !== "string" || !path.startsWith(`${parent}/`)
      || path.includes("..") || path.includes("\\") || path.includes("%") || path.includes("?") || path.includes("#")
      || path.slice(parent.length + 1).includes("/") || !/^[\w./ -]+$/.test(path)) {
      if (onInvalid) { onInvalid(); continue; }
      throw new BackupReadError("Referência de anexo inválida; arquivo não copiado.");
    }
    output.push({ bucket, path, parent });
  }
  return output;
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

export function validateBackupReadUrl(value: string, bucket: string, path: string): URL {
  const url = new URL(value);
  const expected = `/storage/v1/object/sign/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  if (url.protocol !== "https:" || url.hostname !== `${BACKUP_SOURCE_PROJECT}.supabase.co` || url.port
    || url.username || url.password || url.hash || url.pathname !== expected || !url.searchParams.get("token")) {
    throw new BackupReadError("Endereço de leitura do anexo inválido.");
  }
  return url;
}

export async function readBackupBinary(response: Response, maxBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new BackupReadError("Anexo indisponível para leitura.");
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    await response.body.cancel();
    throw new BackupReadError("Anexo excede o limite de tamanho; não incluído.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      checkBackupAbort(signal);
      const { done, value } = await reader.read();
      checkBackupAbort(signal);
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new BackupReadError("Anexo excede o limite de tamanho; não incluído.");
      chunks.push(value);
    }
    if (declared !== null && Number(declared) !== length) throw new BackupReadError("Anexo recebido parcialmente.");
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** The ordinary signed-in client enforces RLS. No administrative key or remote write is used. */
export async function exportAdminBackup(options: AdminBackupOptions): Promise<{ blob: Blob; filename: string; manifest: BackupSummary }> {
  const { tenantId, userId, signal, onProgress } = options;
  if (!/^[0-9a-f-]{36}$/i.test(tenantId) || !/^[0-9a-f-]{36}$/i.test(userId)) throw new BackupStoppedError("Empresa ou usuário inválido.");
  const db = supabase as unknown as BackupReadClient;
  const startedAt = new Date().toISOString();
  const issues: string[] = [];
  const files: Record<string, Uint8Array> = {};
  const fileRecords: FileRecord[] = [];
  const tableRecords: TableRecord[] = [];
  const attachmentRefs = new Map<string, AttachmentReference>();
  const profileIds = new Set<string>();
  const entityIds: Record<string, Set<string>> = { devices: new Set(), service_orders: new Set(), pickups_deliveries: new Set() };
  let rawBytes = 0;
  let redactions = 0;
  let memoryFull = false;

  const context = async () => {
    checkBackupAbort(signal);
    if (getActiveTenantId() !== tenantId) throw new BackupStoppedError("A empresa ativa mudou. Inicie uma nova exportação.");
    const { data, error } = await backupRead(() => supabase.auth.getSession(), signal);
    checkBackupAbort(signal);
    if (error || data.session?.user.id !== userId || getActiveTenantId() !== tenantId) {
      throw new BackupStoppedError("A sessão mudou ou expirou. Inicie uma nova exportação.");
    }
  };
  const authorize = async () => {
    await context();
    const { data, error } = await backupRead(() => supabase.auth.getUser(), signal);
    if (error || data.user?.id !== userId) throw new BackupStoppedError("Não foi possível confirmar a sessão atual.");
    const membership = await backupRead((readSignal) => db.from("tenant_users").select("id,user_id,tenant_id,is_active")
      .eq("tenant_id", tenantId).eq("user_id", userId).eq("is_active", true).abortSignal(readSignal).maybeSingle(), signal);
    const role = await backupRead((readSignal) => db.from("user_roles").select("id,user_id,tenant_id,role")
      .eq("tenant_id", tenantId).eq("user_id", userId).eq("role", "admin").abortSignal(readSignal).maybeSingle(), signal);
    const active = await backupRead((readSignal) => db.rpc("get_active_tenant_id").abortSignal(readSignal), signal);
    await context();
    if (membership.error || membership.data?.tenant_id !== tenantId || membership.data?.user_id !== userId || membership.data?.is_active !== true
      || role.error || role.data?.tenant_id !== tenantId || role.data?.user_id !== userId || role.data?.role !== "admin"
      || active.error || active.data !== tenantId) {
      throw new BackupStoppedError("Somente um administrador ativo da empresa pode exportar os dados.");
    }
  };
  await authorize();

  const addFile = async (path: string, bytes: Uint8Array, rows?: number) => {
    if (bytes.byteLength > BACKUP_FILE_LIMIT) throw new BackupReadError("Arquivo acima do limite de 20 MiB; não incluído.");
    if (rawBytes + bytes.byteLength > BACKUP_RAW_LIMIT - 1024 * 1024) {
      memoryFull = true;
      throw new BackupReadError("Limite de 128 MiB atingido; exportação parcial.");
    }
    const hash = await sha256(bytes);
    checkBackupAbort(signal);
    files[path] = bytes;
    rawBytes += bytes.byteLength;
    fileRecords.push({ path, bytes: bytes.byteLength, sha256: hash, ...(rows === undefined ? {} : { rows }) });
  };

  // Export business data before potentially large technical logs; do not silently omit logs.
  const priority = (name: string) => name === "tenant_users" ? -1 : ["audit_logs", "notification_logs", "notification_queue"].includes(name) ? 2 : name === "profiles" ? 1 : 0;
  const orderedTables = [...BACKUP_TABLES].sort((a, b) => priority(a.name) - priority(b.name));
  for (const [index, table] of orderedTables.entries()) {
    await context();
    onProgress?.({ message: `Exportando ${table.name}`, completed: index, total: orderedTables.length });
    const record: TableRecord = { name: table.name, completed: false, rows: 0, files: [], countBefore: 0, countAfter: 0 };
    tableRecords.push(record);
    if (memoryFull) { issues.push(`${table.name}: não lida devido ao limite de memória.`); continue; }
    try {
      if (table.scope === "profiles" && !tableRecords.find((item) => item.name === "tenant_users")?.completed) {
        throw new BackupReadError("Inventário de usuários da empresa incompleto; perfis não exportados.");
      }
      const ids = [...profileIds];
      const scopes: Array<{ role?: string; profileIds?: string[] }> = table.partitionByRole
        ? BACKUP_ROLES.map((role) => ({ role }))
        : table.scope === "profiles"
          ? Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ({ profileIds: ids.slice(i * 100, i * 100 + 100) }))
          : [{}];
      const scopedQuery = (scope: typeof scopes[number], head = false) => {
        let query = db.from(table.name).select(table.columns, head ? { count: "exact", head: true } : undefined);
        if (table.scope === "tenant") query = query.eq("tenant_id", tenantId);
        else if (table.scope === "tenant-record") query = query.eq("id", tenantId);
        else query = query.in("id", scope.profileIds ?? []);
        if (scope.role) query = query.eq("role", scope.role);
        if (table.name === "app_settings") query = query.in("key", [...SAFE_SETTING_KEYS]);
        return signal ? query.abortSignal(signal) : query;
      };
      const count = async (scope: typeof scopes[number]) => {
        await context();
        const result = await backupRead((readSignal) => scopedQuery(scope, true).abortSignal(readSignal), signal);
        await context();
        if (result.error || typeof result.count !== "number") throw new BackupReadError("Não foi possível confirmar a contagem autorizada.");
        return result.count;
      };
      let pageNumber = 0;
      for (const scope of scopes) {
        const countBefore = await count(scope);
        record.countBefore += countBefore;
        const exported = await readBackupPages({
          cursorKey: table.cursor, signal,
          readPage: async (cursor) => {
            await context();
            let query = scopedQuery(scope).order(table.cursor, { ascending: true }).limit(BACKUP_PAGE_SIZE);
            if (cursor !== null) query = query.gt(table.cursor, cursor);
            const result = await backupRead((readSignal) => query.abortSignal(readSignal), signal);
            await context();
            if (result.error) throw new BackupReadError("Leitura negada ou indisponível; tabela incompleta.");
            if (!Array.isArray(result.data)) throw new BackupReadError("Resposta de tabela inválida.");
            validateBackupRows(result.data, table, tenantId, profileIds);
            return result.data;
          },
          onPage: async (rows) => {
            const sanitized = rows.map((row) => redactBackupValue(row));
            const raw = JSON.stringify({ table: table.name, tenant_id: tenantId, rows: sanitized });
            redactions += (raw.match(/\[REDACTED\]/g) ?? []).length;
            const path = `tables/${table.name}/${String(++pageNumber).padStart(6, "0")}.json`;
            await addFile(path, strToU8(raw), rows.length);
            record.files.push(path);
            record.rows += rows.length;
            if (table.name === "tenant_users") rows.forEach((row) => { if (typeof row.user_id === "string") profileIds.add(row.user_id); });
            if (entityIds[table.name]) rows.forEach((row) => { if (typeof row.id === "string") entityIds[table.name].add(row.id); });
            const references = backupAttachmentReferences(table.name, rows, () => issues.push(`${table.name}: referência de arquivo inválida não copiada.`));
            for (const ref of references) attachmentRefs.set(`${ref.bucket}/${ref.path}`, ref);
          },
        });
        const countAfter = await count(scope);
        record.countAfter += countAfter;
        if (exported !== countBefore || countAfter !== countBefore) throw new BackupReadError("Os dados mudaram durante a leitura ou a contagem divergiu; exige reconciliação.");
      }
      if (record.files.length === 0) {
        const path = `tables/${table.name}/000001.json`;
        await addFile(path, strToU8(JSON.stringify({ table: table.name, tenant_id: tenantId, rows: [] })), 0);
        record.files.push(path);
      }
      record.completed = true;
    } catch (error) {
      if (error instanceof BackupStoppedError) throw error;
      checkBackupAbort(signal);
      issues.push(`${table.name}: ${error instanceof BackupReadError ? error.message : "Falha na exportação; conteúdo parcial."}`);
    }
  }

  const refs = [...attachmentRefs.values()];
  for (const [index, ref] of refs.entries()) {
    await context();
    onProgress?.({ message: `Copiando anexo ${index + 1} de ${refs.length}`, completed: index, total: refs.length });
    if (memoryFull) { issues.push(`Anexo ${index + 1}: omitido pelo limite de memória.`); continue; }
    try {
      const owners = ref.bucket === "device-photos" ? entityIds.devices
        : ref.parent.startsWith("logistics/") ? entityIds.pickups_deliveries : entityIds.service_orders;
      const ownerId = ref.parent.startsWith("logistics/") ? ref.parent.slice("logistics/".length) : ref.parent;
      if (!owners.has(ownerId)) throw new BackupReadError("O registro proprietário do anexo não foi confirmado nesta empresa.");
      const remaining = BACKUP_RAW_LIMIT - 1024 * 1024 - rawBytes;
      if (remaining <= 0) { memoryFull = true; throw new BackupReadError("Limite de memória atingido."); }
      // Signing uses the user's Storage RLS. The short-lived capability never enters the archive.
      const result = await backupRead(() => supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 60), signal);
      await context();
      if (result.error || !result.data?.signedUrl) throw new BackupReadError("Download não autorizado ou indisponível.");
      const url = validateBackupReadUrl(result.data.signedUrl, ref.bucket, ref.path);
      const bytes = await backupRead(async (readSignal) => {
        const response = await fetch(url, { signal: readSignal, redirect: "error", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
        return readBackupBinary(response, Math.min(BACKUP_FILE_LIMIT, remaining), readSignal);
      }, signal);
      await context();
      await addFile(`storage/${ref.bucket}/${ref.path}`, bytes);
    } catch (error) {
      if (error instanceof BackupStoppedError) throw error;
      checkBackupAbort(signal);
      issues.push(`Anexo ${index + 1} (${ref.bucket}): ${error instanceof BackupReadError ? error.message : "Falha na cópia."}`);
    }
  }
  await authorize();
  const summary: BackupSummary = {
    status: issues.length ? "partial" : "completed",
    rowCount: tableRecords.reduce((sum, table) => sum + table.rows, 0),
    tableCount: tableRecords.filter((table) => table.files.length > 0).length,
    issues,
  };
  const manifest = {
    ...summary, format_version: BACKUP_FORMAT_VERSION, source_project_ref: BACKUP_SOURCE_PROJECT,
    tenant_id: tenantId, exported_by: userId, started_at: startedAt, finished_at: new Date().toISOString(),
    scope: { partial_database: true, rls_visible_rows_only: true, transactional_snapshot: false, exclusions: BACKUP_EXCLUSIONS },
    redacted_values: redactions, raw_bytes: rawBytes, tables: tableRecords, files: fileRecords,
    attachments: { referenced: refs.length, copied: fileRecords.filter((file) => file.path.startsWith("storage/")).length },
  };
  const manifestBytes = strToU8(JSON.stringify(manifest, null, 2));
  files["manifest.json"] = manifestBytes;
  files["manifest.sha256"] = strToU8(`${await sha256(manifestBytes)}  manifest.json\n`);
  // Re-read generated bytes before packaging; the manifest describes their exact hashes.
  for (const file of fileRecords) {
    checkBackupAbort(signal);
    if (await sha256(files[file.path]) !== file.sha256) throw new BackupStoppedError("Falha de integridade ao preparar o arquivo.");
  }
  await context();
  onProgress?.({ message: "Preparando o arquivo para download", completed: 1, total: 1 });
  const archive = zipSync(files, { level: 0 });
  checkBackupAbort(signal);
  const filename = `i9-backup-${tenantId.slice(0, 8)}-${startedAt.replace(/[:.]/g, "-")}.zip`;
  return { blob: new Blob([archive as BlobPart], { type: "application/zip" }), filename, manifest: summary };
}
