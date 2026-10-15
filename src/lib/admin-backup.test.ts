import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";

// jsdom supplies its own Uint8Array but Node's TextEncoder. fflate caches its
// encoder at import time, so keep encoded bytes in the browser realm as in production.
vi.hoisted(() => {
  const NodeTextEncoder = globalThis.TextEncoder;
  class BrowserTextEncoder {
    encode(value?: string) { return new Uint8Array(new NodeTextEncoder().encode(value)); }
  }
  vi.stubGlobal("TextEncoder", BrowserTextEncoder);
});

const mocked = vi.hoisted(() => ({
  getActiveTenantId: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  getActiveTenantId: mocked.getActiveTenantId,
  supabase: { auth: { getSession: mocked.getSession, getUser: mocked.getUser }, from: mocked.from, rpc: mocked.rpc },
}));

import {
  BackupStoppedError, backupAttachmentReferences, exportAdminBackup, readBackupPages,
  redactBackupValue, validateBackupRows, validateBackupReadUrl, readBackupBinary, backupRead,
} from "./admin-backup";
import { BACKUP_TABLES, SAFE_SETTING_KEYS } from "./admin-backup-manifest";

const tenantId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

type SyntheticRow = Record<string, unknown>;
type SyntheticResult = { data: SyntheticRow[] | SyntheticRow | null; error: null | { message: string }; count?: number };

/** Small read-only data service: evaluates filters independently of export code. */
class SyntheticQuery implements PromiseLike<SyntheticResult> {
  private predicates: Array<(row: SyntheticRow) => boolean> = [];
  private columns: string[] = [];
  private head = false;
  private single = false;
  private orderBy: string | null = null;
  private cap = 1;
  constructor(private rows: SyntheticRow[], private denied: boolean) {}
  select(columns: string, options?: { head?: boolean }) { this.columns = columns.split(","); this.head = options?.head === true; return this; }
  eq(column: string, value: unknown) { this.predicates.push((row) => row[column] === value); return this; }
  in(column: string, values: string[]) { this.predicates.push((row) => values.includes(String(row[column]))); return this; }
  gt(column: string, value: string) { this.predicates.push((row) => String(row[column]) > value); return this; }
  order(column: string) { this.orderBy = column; return this; }
  limit(requested: number) { this.cap = Math.min(1, requested); return this; }
  abortSignal() { return this; }
  maybeSingle() { this.single = true; return this; }
  private execute(): SyntheticResult {
    if (this.denied) return { data: null, error: { message: "synthetic access denied" } };
    let rows = this.rows.filter((row) => this.predicates.every((predicate) => predicate(row)));
    if (this.head) return { data: null, error: null, count: rows.length };
    if (this.orderBy) { const key = this.orderBy; rows = [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key]))); }
    rows = rows.slice(0, this.cap).map((row) => Object.fromEntries(this.columns.filter((column) => column in row).map((column) => [column, row[column]])));
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }
  then<TResult1 = SyntheticResult, TResult2 = never>(
    onfulfilled?: ((value: SyntheticResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> { return Promise.resolve(this.execute()).then(onfulfilled, onrejected); }
}

function installSyntheticReadApi(deniedTable?: string) {
  const data: Record<string, SyntheticRow[]> = {
    tenant_users: [{ id: "membership-1", tenant_id: tenantId, user_id: userId, is_active: true }],
    user_roles: [{ id: "role-1", tenant_id: tenantId, user_id: userId, role: "admin" }],
    tenants: [{ id: tenantId, name: "Synthetic company" }],
    profiles: [{ id: userId, full_name: "Synthetic administrator" }, { id: "outside-profile", full_name: "Outside scope" }],
    customers: [
      { id: "customer-1", tenant_id: tenantId, name: "Synthetic A" },
      { id: "customer-2", tenant_id: tenantId, name: "Synthetic B" },
      { id: "customer-outside", tenant_id: "outside-tenant", name: "Outside scope" },
    ],
  };
  mocked.from.mockImplementation((table: string) => new SyntheticQuery(data[table] ?? [], table === deniedTable));
}

async function readArchiveBlob(blob: Blob) {
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  return unzipSync(bytes);
}

describe("tenant backup safety", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("crypto", webcrypto);
    mocked.getActiveTenantId.mockReturnValue(tenantId);
    mocked.getSession.mockResolvedValue({ data: { session: { user: { id: userId } } }, error: null });
    mocked.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocked.rpc.mockImplementation(() => ({ abortSignal: () => Promise.resolve({ data: tenantId, error: null }) }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("produces a real ZIP with all 85 declared tables, tenant-scoped rows and verifiable hashes", async () => {
    installSyntheticReadApi();
    const result = await exportAdminBackup({ tenantId, userId });
    const archive = await readArchiveBlob(result.blob);
    const manifest = JSON.parse(strFromU8(archive["manifest.json"]));
    expect(result.manifest).toMatchObject({ status: "completed", tableCount: 85, rowCount: 6, issues: [] });
    expect(manifest).toMatchObject({ source_project_ref: "moijoyqwapimforpijdc", tenant_id: tenantId, exported_by: userId, status: "completed" });
    expect(manifest.scope).toMatchObject({ partial_database: true, transactional_snapshot: false, rls_visible_rows_only: true });
    expect(manifest.tables).toHaveLength(85);
    expect(manifest.tables.every((table: { completed: boolean }) => table.completed)).toBe(true);
    const actualRows: SyntheticRow[] = [];
    for (const file of manifest.files as Array<{ path: string; bytes: number; sha256: string }>) {
      expect(archive[file.path].byteLength).toBe(file.bytes);
      expect(createHash("sha256").update(archive[file.path]).digest("hex")).toBe(file.sha256);
      if (file.path.startsWith("tables/customers/")) actualRows.push(...JSON.parse(strFromU8(archive[file.path])).rows);
    }
    expect(actualRows.map((row) => row.id)).toEqual(["customer-1", "customer-2"]);
    expect(actualRows.every((row) => row.tenant_id === tenantId)).toBe(true);
    const profileFile = JSON.parse(strFromU8(archive["tables/profiles/000001.json"]));
    expect(profileFile.rows.map((row: SyntheticRow) => row.id)).toEqual([userId]);
    expect(strFromU8(archive["manifest.sha256"]).trim()).toBe(`${createHash("sha256").update(archive["manifest.json"]).digest("hex")}  manifest.json`);
    expect(mocked.from.mock.calls.every(([table]) => BACKUP_TABLES.some((item) => item.name === table))).toBe(true);
  });

  it("marks the actual ZIP partial and records denied tables instead of declaring a complete backup", async () => {
    installSyntheticReadApi("customers");
    const result = await exportAdminBackup({ tenantId, userId });
    const archive = await readArchiveBlob(result.blob);
    const manifest = JSON.parse(strFromU8(archive["manifest.json"]));
    expect(result.manifest.status).toBe("partial");
    expect(result.manifest.tableCount).toBe(84);
    expect(manifest.status).toBe("partial");
    expect(manifest.issues.some((issue: string) => issue.startsWith("customers:"))).toBe(true);
    expect(manifest.tables.find((table: { name: string }) => table.name === "customers")).toMatchObject({ completed: false, rows: 0, files: [] });
    expect(Object.keys(archive).some((name) => name.startsWith("tables/customers/"))).toBe(false);
    expect(archive["tables/tenants/000001.json"]).toBeDefined();
  });

  it("traverses server-capped pages until an empty page, without truncating at the cap", async () => {
    const pages = vi.fn().mockResolvedValueOnce([{ id: "01" }, { id: "02" }])
      .mockResolvedValueOnce([{ id: "03" }]).mockResolvedValueOnce([]);
    const emitted: string[] = [];
    expect(await readBackupPages({ cursorKey: "id", readPage: pages, onPage: async (rows) => { emitted.push(...rows.map((row) => String(row.id))); } })).toBe(3);
    expect(emitted).toEqual(["01", "02", "03"]);
    expect(pages.mock.calls.map(([cursor]) => cursor)).toEqual([null, "02", "03"]);
  });

  it("stops when a server repeats a cursor rather than looping or exporting duplicates", async () => {
    const onPage = vi.fn();
    await expect(readBackupPages({ cursorKey: "id", readPage: async () => [{ id: "same" }], onPage })).rejects.toThrow("Paginação inconsistente");
    expect(onPage).toHaveBeenCalledTimes(1);
  });

  it("does not emit a response arriving after cancellation", async () => {
    const abort = new AbortController();
    const onPage = vi.fn();
    await expect(readBackupPages({
      cursorKey: "id", signal: abort.signal, onPage,
      readPage: async () => { abort.abort(); return [{ id: "01" }]; },
    })).rejects.toBeInstanceOf(BackupStoppedError);
    expect(onPage).not.toHaveBeenCalled();
  });

  it("propagates page read failures instead of claiming an empty completed export", async () => {
    await expect(readBackupPages({ cursorKey: "id", readPage: async () => { throw new Error("unavailable"); }, onPage: vi.fn() })).rejects.toThrow("unavailable");
  });

  it("rejects any business row outside the selected tenant", () => {
    const table = BACKUP_TABLES.find((item) => item.name === "customers")!;
    expect(() => validateBackupRows([{ id: "x", tenant_id: "other" }], table, tenantId, new Set())).toThrow(BackupStoppedError);
    expect(() => validateBackupRows([{ id: "x", tenant_id: tenantId }], table, tenantId, new Set())).not.toThrow();
  });

  it("restricts global profiles to IDs from the selected tenant memberships", () => {
    const table = BACKUP_TABLES.find((item) => item.name === "profiles")!;
    expect(() => validateBackupRows([{ id: "outside" }], table, tenantId, new Set([userId]))).toThrow(BackupStoppedError);
    expect(() => validateBackupRows([{ id: userId }], table, tenantId, new Set([userId]))).not.toThrow();
  });

  it("redacts nested credentials and dynamic settings while preserving business values", () => {
    const result = redactBackupValue({
      records: [{ key: "api_key_whatsapp", value: "do-not-export" }],
      old_data: { password_notes: "1234", accessToken: "secret", amount: 199.99 },
      url: "https://example.test/file?token=sensitive&name=invoice",
      tokenInMessage: "Authorization: Bearer confidential",
      signature_data: "customer-signature-image",
    });
    expect(result).toEqual({
      records: [{ key: "api_key_whatsapp", value: "[REDACTED]" }],
      old_data: { password_notes: "[REDACTED]", accessToken: "[REDACTED]", amount: 199.99 },
      url: "https://example.test/file?token=[REDACTED]&name=invoice",
      tokenInMessage: "[REDACTED]",
      signature_data: "customer-signature-image",
    });
  });

  it("excludes known credentials from the query manifest itself", () => {
    expect(BACKUP_TABLES.find((table) => table.name === "devices")!.columns).not.toContain("password_notes");
    expect(BACKUP_TABLES.find((table) => table.name === "service_order_public_links")!.columns).not.toContain("public_token");
    expect(SAFE_SETTING_KEYS.some((key) => /api_key|secret|password/.test(key))).toBe(false);
    expect(BACKUP_TABLES.every((table) => !table.columns.includes("*"))).toBe(true);
    expect(BACKUP_TABLES.some((table) => table.name === "plans" || table.name === "permissions")).toBe(false);
  });

  it("only accepts relative object paths tied to the referenced parent", () => {
    expect(backupAttachmentReferences("device_photos", [{ device_id: "device-1", storage_path: "device-1/photo.jpg" }])).toEqual([
      { bucket: "device-photos", parent: "device-1", path: "device-1/photo.jpg" },
    ]);
    for (const path of ["other/photo.jpg", "device-1/../other.jpg", "https://example.test/photo.jpg", "device-1/%2e%2e.jpg"]) {
      expect(() => backupAttachmentReferences("device_photos", [{ device_id: "device-1", storage_path: path }])).toThrow();
    }
  });

  it("retains valid attachments when another reference in the same page is invalid", () => {
    const issue = vi.fn();
    const refs = backupAttachmentReferences("device_photos", [
      { device_id: "device-1", storage_path: "device-1/first.jpg" },
      { device_id: "device-1", storage_path: "other/invalid.jpg" },
      { device_id: "device-1", storage_path: "device-1/last.jpg" },
    ], issue);
    expect(refs.map((ref) => ref.path)).toEqual(["device-1/first.jpg", "device-1/last.jpg"]);
    expect(issue).toHaveBeenCalledOnce();
  });

  it("rejects foreign origins and paths before fetching a signed attachment", () => {
    const origin = "https://moijoyqwapimforpijdc.supabase.co";
    const path = "/storage/v1/object/sign/device-photos/device-1/photo.jpg?token=ephemeral";
    expect(validateBackupReadUrl(origin + path, "device-photos", "device-1/photo.jpg").origin).toBe(origin);
    for (const address of ["https://foreign.example" + path, origin + path.replace("device-1", "device-2"), origin.replace("https", "http") + path]) {
      expect(() => validateBackupReadUrl(address, "device-photos", "device-1/photo.jpg")).toThrow();
    }
  });

  it("stops streaming above the byte budget even without a Content-Length header", async () => {
    const cancel = vi.fn();
    let emitted = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { if (!emitted) { emitted = true; controller.enqueue(new Uint8Array(9)); } },
      cancel,
    });
    await expect(readBackupBinary(new Response(body), 8)).rejects.toThrow("excede o limite");
    expect(cancel).toHaveBeenCalled();
  });

  it("cancels even SDK reads that expose no cancellation parameter", async () => {
    const abort = new AbortController();
    const pending = backupRead(() => new Promise<never>(() => undefined), abort.signal);
    abort.abort();
    await expect(pending).rejects.toBeInstanceOf(BackupStoppedError);
  });

  it("stops before data reads if the tenant was switched", async () => {
    mocked.getActiveTenantId.mockReturnValue("other");
    await expect(exportAdminBackup({ tenantId, userId })).rejects.toThrow("empresa ativa mudou");
    expect(mocked.from).not.toHaveBeenCalled();
  });

  it("stops before data reads if the signed-in user changed", async () => {
    mocked.getSession.mockResolvedValue({ data: { session: { user: { id: "other" } } }, error: null });
    await expect(exportAdminBackup({ tenantId, userId })).rejects.toThrow("sessão mudou");
    expect(mocked.from).not.toHaveBeenCalled();
  });

  it("requires a server-read active membership and admin role before exporting", async () => {
    const query = { select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.abortSignal.mockReturnValue(query);
    mocked.from.mockReturnValue(query);
    await expect(exportAdminBackup({ tenantId, userId })).rejects.toThrow("administrador ativo");
    expect(mocked.from.mock.calls.map(([table]) => table)).toEqual(["tenant_users", "user_roles"]);
    expect(query.eq).toHaveBeenCalledWith("tenant_id", tenantId);
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.eq).toHaveBeenCalledWith("role", "admin");
  });
});
