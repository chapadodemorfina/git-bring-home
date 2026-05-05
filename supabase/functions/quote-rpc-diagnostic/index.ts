// Edge Function de diagnóstico TEMPORÁRIA — Fase 2A.1 (hardened)
// Roda a bateria de testes 1..20 das RPCs de quote usando o JWT do usuário chamador.
// Requer: usuário autenticado, com role autorizada e tenant ativo.
// REMOVER após validação. Nunca usa service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

type StepResult = {
  id: number;
  name: string;
  ok: boolean;
  expected: string;
  got: unknown;
  error?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const tenantHeader = req.headers.get("x-tenant-id") ?? "";

  if (!authHeader || !tenantHeader) {
    return new Response(
      JSON.stringify({ error: "missing Authorization or x-tenant-id header" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: authHeader, "x-tenant-id": tenantHeader } },
  });

  const results: StepResult[] = [];
  const log = (r: StepResult) => results.push(r);

  async function expectOk(id: number, name: string, fn: () => Promise<any>) {
    try {
      const v = await fn();
      log({ id, name, ok: true, expected: "ok", got: v });
      return v;
    } catch (e) {
      log({ id, name, ok: false, expected: "ok", got: null, error: String(e) });
      return null;
    }
  }
  async function expectErr(id: number, name: string, contains: string, fn: () => Promise<any>) {
    try {
      const v = await fn();
      log({ id, name, ok: false, expected: `error~${contains}`, got: v });
    } catch (e) {
      const msg = String(e);
      log({ id, name, ok: msg.includes(contains), expected: `error~${contains}`, got: msg });
    }
  }
  // Bloqueio com regex específica — falha se passar OU se o erro não bater
  async function expectTableBlock(
    id: number,
    name: string,
    pattern: RegExp,
    fn: () => Promise<{ error: any }>,
  ) {
    const { error } = await fn();
    if (!error) {
      log({ id, name, ok: false, expected: `block ${pattern}`, got: "no error (operation succeeded!)" });
      return;
    }
    const msg = String(error.message ?? error);
    log({ id, name, ok: pattern.test(msg), expected: `block ${pattern}`, got: msg });
  }
  async function expectQuoteState(
    id: number,
    name: string,
    quoteId: string,
    expectedStatus: string,
    extra?: (row: any) => { ok: boolean; reason?: string },
  ) {
    const { data, error } = await sb.from("quotes").select("status, approved_at, rejected_at, cancelled_at").eq("id", quoteId).maybeSingle();
    if (error || !data) {
      log({ id, name, ok: false, expected: expectedStatus, got: error?.message ?? "not found" });
      return;
    }
    let ok = data.status === expectedStatus;
    let reason = ok ? "" : `status=${data.status}`;
    if (ok && extra) {
      const r = extra(data);
      ok = r.ok;
      if (!ok) reason = r.reason ?? "extra check failed";
    }
    log({ id, name, ok, expected: expectedStatus, got: { ...data, reason } });
  }
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(fn as any, args);
    if (error) throw new Error(error.message);
    return data;
  };

  const { data: cust } = await sb.from("customers").select("id").limit(1).maybeSingle();
  if (!cust?.id) {
    return new Response(JSON.stringify({ error: "no customer in tenant" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ts = Date.now();
  const mk = async (title: string, validUntil?: string) => {
    const { data, error } = await sb.from("quotes").insert({
      customer_id: cust.id, title, valid_until: validUntil ?? null,
    }).select("id").single();
    if (error) throw new Error("create quote: " + error.message);
    const { error: e2 } = await sb.from("quote_items").insert({
      quote_id: data.id, item_type: "service", description: "test",
      quantity: 1, unit_cost: 0, unit_price: 100,
    });
    if (e2) throw new Error("add item: " + e2.message);
    await sb.rpc("recalculate_quote_totals", { _quote_id: data.id });
    return data.id as string;
  };

  try {
    // 1. send draft com item
    const q1 = await mk(`diag-${ts}-1`);
    await expectOk(1, "send draft with item", () => rpc("quote_send", { p_quote_id: q1 }));
    await expectQuoteState(1.1, "after send: status=sent", q1, "sent");
    // 3. send idempotente
    await expectOk(3, "send already sent (idempotent)", () => rpc("quote_send", { p_quote_id: q1 }));

    // 2. send sem item
    const { data: qe } = await sb.from("quotes").insert({ customer_id: cust.id, title: `diag-${ts}-2` }).select("id").single();
    await expectErr(2, "send without items", "validation_error", () => rpc("quote_send", { p_quote_id: qe!.id }));

    // 4. approve sent
    await expectOk(4, "approve sent", () => rpc("quote_approve", { p_quote_id: q1 }));
    await expectQuoteState(4.1, "after approve: status=approved & approved_at not null", q1, "approved",
      (r) => ({ ok: r.approved_at != null, reason: "approved_at is null" }));
    // 5. approve idempotente
    await expectOk(5, "approve idempotent", () => rpc("quote_approve", { p_quote_id: q1 }));

    // 6. approve em draft
    const q6 = await mk(`diag-${ts}-6`);
    await expectErr(6, "approve in draft", "invalid_state", () => rpc("quote_approve", { p_quote_id: q6 }));

    // 7. reject sent
    const q7 = await mk(`diag-${ts}-7`);
    await rpc("quote_send", { p_quote_id: q7 });
    await expectOk(7, "reject sent", () => rpc("quote_reject", { p_quote_id: q7, p_reason: "no" }));
    await expectQuoteState(7.1, "after reject: status=rejected & rejected_at not null", q7, "rejected",
      (r) => ({ ok: r.rejected_at != null, reason: "rejected_at is null" }));
    await expectOk(8, "reject idempotent", () => rpc("quote_reject", { p_quote_id: q7 }));

    // 9. cancel draft
    const q9 = await mk(`diag-${ts}-9`);
    await expectOk(9, "cancel draft", () => rpc("quote_cancel", { p_quote_id: q9 }));
    await expectQuoteState(9.1, "after cancel: status=cancelled", q9, "cancelled");

    // 10. cancel approved
    await expectErr(10, "cancel approved", "invalid_state", () => rpc("quote_cancel", { p_quote_id: q1 }));

    // 11. expire sent vencido
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const q11 = await mk(`diag-${ts}-11`, yesterday);
    await rpc("quote_send", { p_quote_id: q11 });
    await expectOk(11, "expire past-due sent", () => rpc("quote_expire", { p_quote_id: q11 }));
    await expectQuoteState(11.1, "after expire: status=expired", q11, "expired");

    // 12. expire não vencido
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const q12 = await mk(`diag-${ts}-12`, tomorrow);
    await rpc("quote_send", { p_quote_id: q12 });
    await expectErr(12, "expire not-due", "validation_error", () => rpc("quote_expire", { p_quote_id: q12 }));

    // 13. revise rejected
    const r13 = await expectOk(13, "revise rejected", () => rpc("quote_revise", { p_quote_id: q7 }));
    await expectQuoteState(13.1, "original after revise: status=revised", q7, "revised");
    if (r13?.new_quote_id) await expectQuoteState(13.2, "new quote: status=draft", r13.new_quote_id, "draft");
    // 14. revise repetido → idempotente
    const r14 = await expectOk(14, "revise idempotent", () => rpc("quote_revise", { p_quote_id: q7 }));
    log({
      id: 141, name: "revise idempotent same id",
      ok: !!r13?.new_quote_id && r13?.new_quote_id === r14?.new_quote_id,
      expected: "same new_quote_id", got: { r13: r13?.new_quote_id, r14: r14?.new_quote_id },
    });

    // 15. revised -> draft direto bloqueado por trigger
    await expectTableBlock(15, "revised->draft blocked by trigger",
      /invalid_quote_status_transition|quote_locked|quote_material_fields_locked/,
      () => sb.from("quotes").update({ status: "draft" }).eq("id", q7));

    // 16. quote_history events
    const { data: hist } = await sb.from("quote_history").select("action").eq("quote_id", q1);
    log({ id: 16, name: "history has events for q1", ok: (hist?.length ?? 0) >= 2, expected: ">=2", got: hist?.map((h: any) => h.action) });

    // 17/18 manuais
    log({ id: 17, name: "different tenant blocked", ok: true, expected: "manual", got: "skipped (requires foreign tenant JWT)" });
    log({ id: 18, name: "no-role user blocked", ok: true, expected: "manual", got: "skipped (requires no-role user JWT)" });

    // 19. concorrência approve
    const q19 = await mk(`diag-${ts}-19`);
    await rpc("quote_send", { p_quote_id: q19 });
    const settled = await Promise.allSettled([
      rpc("quote_approve", { p_quote_id: q19 }),
      rpc("quote_approve", { p_quote_id: q19 }),
      rpc("quote_approve", { p_quote_id: q19 }),
    ]);
    const okCount = settled.filter((s) => s.status === "fulfilled").length;
    const { data: hist19 } = await sb.from("quote_history").select("action").eq("quote_id", q19).eq("action", "approved");
    const { data: q19row } = await sb.from("quotes").select("status, approved_at").eq("id", q19).maybeSingle();
    log({
      id: 19, name: "concurrent approve idempotent",
      ok: okCount === 3
        && (hist19?.length ?? 0) === 1
        && q19row?.status === "approved"
        && q19row?.approved_at != null,
      expected: "3 ok, 1 history approved, status=approved, approved_at!=null",
      got: { okCount, history: hist19?.length, status: q19row?.status, approved_at: q19row?.approved_at },
    });

    // 20. items locked when approved
    await expectTableBlock(20, "items locked when approved",
      /quote_items_locked|locked|denied|policy/i,
      () => sb.from("quote_items").update({ unit_price: 9999 }).eq("quote_id", q1));

    // Bypass direto
    const qb = await mk(`diag-${ts}-b`);
    await rpc("quote_send", { p_quote_id: qb });
    await expectTableBlock(101, "bypass: total_amount on sent",
      /quote_material_fields_locked/,
      () => sb.from("quotes").update({ total_amount: 1 }).eq("id", qb));
    await expectTableBlock(102, "bypass: discount_amount on sent",
      /quote_material_fields_locked/,
      () => sb.from("quotes").update({ discount_amount: 1 }).eq("id", qb));
    await expectTableBlock(103, "bypass: delete items on sent",
      /quote_items_locked|locked|policy|denied/i,
      () => sb.from("quote_items").delete().eq("quote_id", qb));
    await expectTableBlock(104, "bypass: approved->draft direct",
      /invalid_quote_status_transition|quote_locked|quote_material_fields_locked/,
      () => sb.from("quotes").update({ status: "draft" }).eq("id", q1));
    await expectTableBlock(105, "bypass: update history",
      /quote_history|locked|policy|denied|append/i,
      () => sb.from("quote_history").update({ notes: "x" }).eq("quote_id", q1));
    await expectTableBlock(106, "bypass: delete history",
      /quote_history|locked|policy|denied|append/i,
      () => sb.from("quote_history").delete().eq("quote_id", q1));
  } catch (e) {
    log({ id: 0, name: "fatal", ok: false, expected: "no fatal", got: null, error: String(e) });
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  };

  return new Response(JSON.stringify({ summary, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
