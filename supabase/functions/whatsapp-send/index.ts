import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function to send a WhatsApp message via provider.
 * Used by human reply flow to actually deliver messages.
 * Body: { conversation_id, text }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    
    // Allow service role or authenticated user
    let userId: string | null = null;
    if (token !== serviceRoleKey) {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      userId = user.id;
    }

    const body = await req.json();
    const { conversation_id, text } = body;

    if (!conversation_id || !text) {
      return jsonResponse({ error: "conversation_id and text are required" }, 400);
    }

    // Get conversation phone
    const { data: conv, error: convErr } = await supabase
      .from("whatsapp_conversations")
      .select("phone, status")
      .eq("id", conversation_id)
      .single();

    if (convErr || !conv) {
      return jsonResponse({ error: "Conversation not found" }, 404);
    }

    // Store the outbound message
    await supabase.from("whatsapp_messages").insert({
      conversation_id,
      direction: "outbound",
      message_type: "text",
      text_content: text,
      sent_by_user_id: userId,
    });

    // Update conversation status
    await supabase.from("whatsapp_conversations")
      .update({ status: "human_active", last_message_at: new Date().toISOString(), assigned_to_user_id: userId })
      .eq("id", conversation_id);

    // Attempt actual delivery
    const delivery = await sendViaProvider(conv.phone, text);

    return jsonResponse({
      success: true,
      conversation_id,
      delivery,
    });
  } catch (error: any) {
    console.error("whatsapp-send error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

async function sendViaProvider(phone: string, message: string) {
  const apiKey = Deno.env.get("WHATSAPP_API_KEY");
  const apiUrl = Deno.env.get("WHATSAPP_API_URL");

  if (!apiKey || !apiUrl) {
    console.log(`[DEV] Human reply to ${phone}: ${message.substring(0, 100)}...`);
    return { sent: false, reason: "whatsapp_provider_not_configured", mode: "dev_fallback" };
  }

  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ to: phone, message }),
    });
    const data = await resp.json().catch(() => ({}));
    return { sent: resp.ok, status: resp.status, provider_response: data };
  } catch (err: any) {
    return { sent: false, error: err.message };
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
