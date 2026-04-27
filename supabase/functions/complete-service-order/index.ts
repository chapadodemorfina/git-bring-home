import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const STATUS_PATH = [
  "awaiting_diagnosis",
  "in_repair",
  "in_testing",
  "ready_for_pickup",
  "delivered",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Token inválido" }, 401);

    const { orderNumber, orderId, notes } = await req.json().catch(() => ({}));
    if (!orderNumber && !orderId) return jsonResponse({ error: "Informe a OS" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = admin
      .from("service_orders")
      .select("id, order_number, status, tenant_id, total_amount")
      .limit(1);
    query = orderId ? query.eq("id", orderId) : query.eq("order_number", orderNumber);
    const { data: orders, error: orderError } = await query;
    if (orderError) throw orderError;
    const order = orders?.[0];
    if (!order) return jsonResponse({ error: "OS não encontrada" }, 404);

    const { data: tenantLink } = await admin
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", order.tenant_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!tenantLink) return jsonResponse({ error: "Sem acesso ao tenant desta OS" }, 403);

    const { data: entries, error: entriesError } = await admin
      .from("financial_entries")
      .select("id, amount, paid_amount, status")
      .eq("service_order_id", order.id);
    if (entriesError) throw entriesError;

    const total = Number(order.total_amount || 0);
    const paid = (entries || []).reduce((sum: number, entry: any) => sum + Number(entry.paid_amount || 0), 0);
    if (total > 0 && paid + 0.009 < total) {
      return jsonResponse({ error: "OS ainda possui saldo pendente", total, paid }, 409);
    }

    let currentStatus = String(order.status);
    const changed: string[] = [];
    for (const nextStatus of STATUS_PATH) {
      if (currentStatus === "delivered") break;
      if (STATUS_PATH.indexOf(nextStatus) < STATUS_PATH.indexOf(currentStatus)) continue;

      const { error: rpcError } = await admin.rpc("change_service_order_status", {
        _order_id: order.id,
        _from_status: currentStatus,
        _to_status: nextStatus,
        _notes: notes || "OS concluída via solicitação administrativa. Pagamento confirmado.",
      }, { headers: { "x-tenant-id": order.tenant_id } });
      if (rpcError) throw rpcError;
      changed.push(nextStatus);
      currentStatus = nextStatus;
    }

    return jsonResponse({ ok: true, orderId: order.id, orderNumber: order.order_number, status: currentStatus, changed });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
