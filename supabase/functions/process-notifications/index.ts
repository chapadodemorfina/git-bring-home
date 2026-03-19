import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MINUTES = 2;

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

    // Step 1: Process pending events
    const { data: eventResult, error: evtErr } = await supabase.rpc("process_notification_events");
    if (evtErr) console.error("process_notification_events error:", evtErr);

    // Step 2: Process due queue items
    const { data: queueItems, error: qErr } = await supabase
      .from("notification_queue")
      .select("*")
      .in("status", ["pending"])
      .lte("next_attempt_at", new Date().toISOString())
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(50);

    if (qErr) {
      console.error("Queue fetch error:", qErr);
      throw qErr;
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of queueItems || []) {
      await supabase
        .from("notification_queue")
        .update({ status: "processing", last_attempt_at: new Date().toISOString() })
        .eq("id", item.id);

      const result = await deliverNotification(item, supabase);
      const newAttempts = item.attempts + 1;

      if (result.success) {
        await supabase
          .from("notification_queue")
          .update({ status: "sent", sent_at: new Date().toISOString(), attempts: newAttempts })
          .eq("id", item.id);
        sent++;
      } else if (result.skip) {
        await supabase
          .from("notification_queue")
          .update({ status: "skipped", error_message: result.error, attempts: newAttempts })
          .eq("id", item.id);
        skipped++;
      } else {
        const nextStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
        const backoffMinutes = Math.pow(BACKOFF_BASE_MINUTES, newAttempts);
        const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

        await supabase
          .from("notification_queue")
          .update({ status: nextStatus, error_message: result.error, attempts: newAttempts, next_attempt_at: nextAttempt })
          .eq("id", item.id);
        failed++;
      }

      await supabase.from("notification_logs").insert({
        queue_id: item.id,
        provider_key: result.provider || item.channel,
        request_payload: {
          channel: item.channel,
          recipient: item.recipient_address,
          body_preview: item.rendered_body?.substring(0, 200),
        },
        response_payload: result.response || null,
        response_status: result.statusCode || null,
      });
    }

    const summary = {
      success: true,
      events_processed: eventResult?.queued ?? 0,
      queue_sent: sent,
      queue_failed: failed,
      queue_skipped: skipped,
      ran_at: new Date().toISOString(),
    };

    console.log("Notification processing completed:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notification processor error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

interface DeliveryResult {
  success: boolean;
  skip?: boolean;
  error?: string;
  provider?: string;
  response?: Record<string, unknown>;
  statusCode?: number;
}

async function deliverNotification(
  item: Record<string, unknown>,
  _supabase: ReturnType<typeof createClient>
): Promise<DeliveryResult> {
  const channel = item.channel as string;

  switch (channel) {
    case "whatsapp":
      return deliverWhatsApp(item);
    case "email":
      return deliverEmail(item);
    case "sms":
      return deliverSms(item);
    case "internal":
      return { success: true, provider: "internal", response: { stored: true } };
    default:
      return { success: false, skip: true, error: `Unknown channel: ${channel}`, provider: "none" };
  }
}

async function deliverWhatsApp(item: Record<string, unknown>): Promise<DeliveryResult> {
  const apiKey = Deno.env.get("WHATSAPP_API_KEY");
  const apiUrl = Deno.env.get("WHATSAPP_API_URL");

  if (!apiKey || !apiUrl) {
    return { success: false, skip: true, error: "WhatsApp provider not configured", provider: "whatsapp_not_configured" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ to: item.recipient_address, message: item.rendered_body }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      return { success: true, provider: "whatsapp", response: body, statusCode: response.status };
    }
    return { success: false, error: `WhatsApp API returned ${response.status}`, provider: "whatsapp", response: body, statusCode: response.status };
  } catch (err) {
    return { success: false, error: `WhatsApp delivery error: ${err.message}`, provider: "whatsapp" };
  }
}

async function deliverEmail(item: Record<string, unknown>): Promise<DeliveryResult> {
  const apiKey = Deno.env.get("EMAIL_API_KEY");
  const apiUrl = Deno.env.get("EMAIL_API_URL");
  const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@example.com";

  if (!apiKey || !apiUrl) {
    return { success: false, skip: true, error: "Email provider not configured", provider: "email_not_configured" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: fromEmail, to: item.recipient_address, subject: item.rendered_subject || "Notificação", text: item.rendered_body }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      return { success: true, provider: "email", response: body, statusCode: response.status };
    }
    return { success: false, error: `Email API returned ${response.status}`, provider: "email", response: body, statusCode: response.status };
  } catch (err) {
    return { success: false, error: `Email delivery error: ${err.message}`, provider: "email" };
  }
}

async function deliverSms(item: Record<string, unknown>): Promise<DeliveryResult> {
  return { success: false, skip: true, error: "SMS provider not configured", provider: "sms_not_configured" };
}
