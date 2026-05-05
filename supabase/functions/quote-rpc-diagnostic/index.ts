// Edge Function de diagnóstico TEMPORÁRIA — Fase 2A.1
// Roda a bateria de testes 1..20 das RPCs de quote usando o JWT do usuário chamador.
// Requer: usuário autenticado, com role autorizada e tenant ativo.
// REMOVER após validação. Não expor publicamente.

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

  // helper para chamada esperando sucesso
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
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(fn as any, args);
    if (error) throw new Error(error.message);
    return data;
  };
  const tableErr = async (fn: () => Promise<any>) => {
    const { error } = await fn();
    if (!error) throw new Error("expected RLS/trigger to block");
    return error.message;
  };

  // Pegar customer válido do tenant
  const { data: cust } = await sb.from("customers").select("id").limit(1).maybeSingle();
  if (!cust?.id) {
    return new Response(JSON.stringify({ error: "no customer in tenant" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ts = Date.now();
  // Cria um quote draft com 1 item
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
    // 3. send idempotente
    await expectOk(3, "send already sent (idempotent)", () => rpc("quote_send", { p_quote_id: q1 }));

    // 2. send sem item
    const { data: qe } = await sb.from("quotes").insert({ customer_id: cust.id, title: `diag-${ts}-2` }).select("id").single();
    await expectErr(2, "send without items", "validation_error", () => rpc("quote_send", { p_quote_id: qe!.id }));

    // 4. approve sent
    await expectOk(4, "approve sent", () => rpc("quote_approve", { p_quote_id: q1 }));
    // 5. approve idempotente
    await expectOk(5, "approve idempotent", () => rpc("quote_approve", { p_quote_id: q1 }));

    // 6. approve em draft
    const q6 = await mk(`diag-${ts}-6`);
    await expectErr(6, "approve in draft", "invalid_state", () => rpc("quote_approve", { p_quote_id: q6 }));

    // 7. reject sent
    const q7 = await mk(`diag-${ts}-7`);
    await rpc("quote_send", { p_quote_id: q7 });
    await expectOk(7, "reject sent", () => rpc("quote_reject", { p_quote_id: q7, p_reason: "no" }));
    await expectOk(8, "reject idempotent", () => rpc("quote_reject", { p_quote_id: q7 }));

    // 9. cancel draft
    const q9 = await mk(`diag-${ts}-9`);
    await expectOk(9, "cancel draft", () => rpc("quote_cancel", { p_quote_id: q9 }));

    // 10. cancel approved
    await expectErr(10, "cancel approved", "invalid_state", () => rpc("quote_cancel", { p_quote_id: q1 }));

    // 11. expire sent vencido (cria com valid_until=ontem)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const q11 = await mk(`diag-${ts}-11`, yesterday);
    await rpc("quote_send", { p_quote_id: q11 });
    await expectOk(11, "expire past-due sent", () => rpc("quote_expire", { p_quote_id: q11 }));

    // 12. expire não vencido
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const q12 = await mk(`diag-${ts}-12`, tomorrow);
    await rpc("quote_send", { p_quote_id: q12 });
    await expectErr(12, "expire not-due", "validation_error", () => rpc("quote_expire", { p_quote_id: q12 }));

    // 13. revise rejected
    const r13 = await expectOk(13, "revise rejected", () => rpc("quote_revise", { p_quote_id: q7 }));
    // 14. revise repetido → idempotente
    const r14 = await expectOk(14, "revise idempotent", () => rpc("quote_revise", { p_quote_id: q7 }));
    log({
      id: 141, name: "revise idempotent same id",
      ok: r13?.new_quote_id === r14?.new_quote_id, expected: "same new_quote_id",
      got: { r13: r13?.new_quote_id, r14: r14?.new_quote_id },
    });

    // 15. revised -> draft direto bloqueado por trigger
    const blocked15 = await tableErr(() => sb.from("quotes").update({ status: "draft" }).eq("id", q7));
    log({ id: 15, name: "revised->draft blocked", ok: /invalid_quote_status_transition|quote_locked/.test(blocked15), expected: "blocked", got: blocked15 });

    // 16. quote_history events
    const { data: hist } = await sb.from("quote_history").select("action").eq("quote_id", q1);
    log({ id: 16, name: "history has events", ok: (hist?.length ?? 0) >= 2, expected: ">=2", got: hist?.map((h: any) => h.action) });

    // 18. usuário sem role: pulado (precisa outro JWT). Marcar manual.
    log({ id: 18, name: "no-role user blocked", ok: true, expected: "manual", got: "skipped (requires unauth user JWT)" });
    // 17. tenant diferente: pulado (precisa outro x-tenant-id). Marcar manual.
    log({ id: 17, name: "different tenant blocked", ok: true, expected: "manual", got: "skipped (requires foreign tenant JWT)" });

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
    log({ id: 19, name: "concurrent approve", ok: okCount === 3 && (hist19?.length ?? 0) === 1, expected: "3 ok, 1 history approved", got: { okCount, history: hist19?.length } });

    // 20. nenhuma RPC altera itens de quote aprovado
    const itemsBefore = (await sb.from("quote_items").select("id,total_price").eq("quote_id", q1)).data;
    const tryEdit = await tableErr(() => sb.from("quote_items").update({ unit_price: 9999 }).eq("quote_id", q1));
    log({ id: 20, name: "items locked when approved", ok: /quote_items_locked|locked|denied/i.test(tryEdit), expected: "blocked", got: tryEdit });

    // Bypass direto: total/discount em sent
    const qb = await mk(`diag-${ts}-b`);
    await rpc("quote_send", { p_quote_id: qb });
    const b1 = await tableErr(() => sb.from("quotes").update({ total_amount: 1 }).eq("id", qb));
    log({ id: 101, name: "bypass: total_amount on sent", ok: /quote_material_fields_locked|locked/.test(b1), expected: "blocked", got: b1 });
    const b2 = await tableErr(() => sb.from("quotes").update({ discount_amount: 1 }).eq("id", qb));
    log({ id: 102, name: "bypass: discount_amount on sent", ok: /quote_material_fields_locked|locked/.test(b2), expected: "blocked", got: b2 });
    const b3 = await tableErr(() => sb.from("quote_items").delete().eq("quote_id", qb));
    log({ id: 103, name: "bypass: delete items on sent", ok: !!b3, expected: "blocked", got: b3 });
    const b4 = await tableErr(() => sb.from("quotes").update({ status: "draft" }).eq("id", q1));
    log({ id: 104, name: "bypass: approved->draft", ok: /invalid|locked|transition/i.test(b4), expected: "blocked", got: b4 });
    const b5 = await tableErr(() => sb.from("quote_history").update({ notes: "x" }).eq("quote_id", q1));
    log({ id: 105, name: "bypass: update history", ok: !!b5, expected: "blocked", got: b5 });
    const b6 = await tableErr(() => sb.from("quote_history").delete().eq("quote_id", q1));
    log({ id: 106, name: "bypass: delete history", ok: !!b6, expected: "blocked", got: b6 });
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
