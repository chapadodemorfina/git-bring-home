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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Expire stale quotes
    const { data: expiredCount, error: expErr } = await supabase.rpc(
      "expire_stale_quotes"
    );
    if (expErr) console.error("expire_stale_quotes error:", expErr);

    // 2. Mark overdue financial entries
    const { data: overdueCount, error: ovdErr } = await supabase.rpc(
      "mark_overdue_entries"
    );
    if (ovdErr) console.error("mark_overdue_entries error:", ovdErr);

    const result = {
      success: true,
      expired_quotes: expiredCount ?? 0,
      overdue_entries: overdueCount ?? 0,
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
