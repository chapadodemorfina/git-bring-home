import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- AUTH: Only allow service role or valid JWT ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (token !== serviceRoleKey) {
      // Not service role - validate as authenticated user with admin role
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Expire stale quotes
    const { data: expiredCount, error: expErr } = await supabase.rpc("expire_stale_quotes");
    if (expErr) console.error("expire_stale_quotes error:", expErr);

    // 2. Mark overdue financial entries
    const { data: overdueCount, error: ovdErr } = await supabase.rpc("mark_overdue_entries");
    if (ovdErr) console.error("mark_overdue_entries error:", ovdErr);

    // 3. Process notification events
    const { data: notifEvents, error: neErr } = await supabase.rpc("process_notification_events");
    if (neErr) console.error("process_notification_events error:", neErr);

    // 4. Process notification queue
    let notifResult = null;
    try {
      const notifResp = await fetch(
        `${supabaseUrl}/functions/v1/process-notifications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ source: "scheduled-tasks" }),
        }
      );
      notifResult = await notifResp.json().catch(() => null);
    } catch (err) {
      console.error("process-notifications call error:", err);
    }

    // 5. Expire stale WhatsApp pending states
    const { data: expiredStates, error: wpsErr } = await supabase.rpc("wa_expire_pending_states");
    if (wpsErr) console.error("wa_expire_pending_states error:", wpsErr);

    // 6. Archive stale WhatsApp conversations
    const { data: archivedConvs, error: waErr } = await supabase.rpc("wa_archive_stale_conversations");
    if (waErr) console.error("wa_archive_stale_conversations error:", waErr);

    // 7. Refresh materialized views
    const { error: mvErr } = await supabase.rpc("refresh_materialized_views");
    if (mvErr) console.error("refresh_materialized_views error:", mvErr);

    // 8. Run consistency checks
    const { data: consistencyResult, error: ccErr } = await supabase.rpc("run_consistency_checks");
    if (ccErr) console.error("run_consistency_checks error:", ccErr);

    // 9. Detect stale devices
    const { data: staleDevices, error: sdErr } = await supabase.rpc("detect_stale_devices", { days_threshold: 5 });
    if (sdErr) console.error("detect_stale_devices error:", sdErr);

    const result = {
      success: true,
      expired_quotes: expiredCount ?? 0,
      overdue_entries: overdueCount ?? 0,
      notification_events: notifEvents ?? null,
      notification_delivery: notifResult,
      expired_wa_states: expiredStates ?? 0,
      archived_wa_conversations: archivedConvs ?? 0,
      materialized_views_refreshed: !mvErr,
      consistency_checks: consistencyResult ?? null,
      stale_devices_count: staleDevices?.length ?? 0,
      ran_at: new Date().toISOString(),
    };

    console.log("Scheduled tasks completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled tasks error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
