import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const CONFIRMATION_WORDS = ["sim", "confirmo", "aprovar", "aprovado", "confirmar"];
const REJECTION_WORDS = ["não", "nao", "recusar", "recuso", "rejeitar"];
const PENDING_STATE_TTL_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { phone, message, provider_message_id, message_type = "text" } = body;

    if (!phone || !message) {
      return jsonResponse({ error: "phone and message are required" }, 400);
    }

    const normalizedPhone = normalizePhone(phone);

    // === IDEMPOTENCY CHECK ===
    if (provider_message_id) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("provider_message_id", provider_message_id)
        .limit(1);
      if (existing && existing.length > 0) {
        return jsonResponse({ status: "duplicate", message_id: existing[0].id });
      }
    }

    // === RATE LIMITING ===
    const rateLimitOk = await checkRateLimit(supabase, normalizedPhone);
    if (!rateLimitOk) {
      console.warn(`Rate limit exceeded for ${normalizedPhone}`);
      return jsonResponse({ error: "rate_limit_exceeded", phone: normalizedPhone }, 429);
    }

    // 1. Get or create conversation
    const conversation = await getOrCreateConversation(supabase, normalizedPhone);

    // 2. Store inbound message
    const { data: inboundMsg, error: insertErr } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      direction: "inbound",
      message_type,
      provider_message_id,
      text_content: message,
    }).select().single();

    // Handle duplicate insert race condition
    if (insertErr) {
      if (insertErr.code === "23505") {
        return jsonResponse({ status: "duplicate", note: "provider_message_id conflict" });
      }
      throw insertErr;
    }

    // Update last_message_at
    await supabase.from("whatsapp_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // 3. Check handoff state
    if (conversation.status === "waiting_human" || conversation.status === "human_active") {
      return jsonResponse({
        conversation_id: conversation.id,
        status: conversation.status,
        response: null,
        note: "Conversation is in handoff mode. Message stored for human attendant.",
      });
    }

    // === CHECK PENDING STATE (multi-turn) ===
    const pendingState = await getActivePendingState(supabase, conversation.id);

    if (pendingState) {
      const result = await handlePendingState(supabase, conversation, pendingState, message, inboundMsg?.id, lovableApiKey);
      if (result.handled) {
        await storeOutbound(supabase, conversation.id, result.response!);
        await sendWhatsAppMessage(normalizedPhone, result.response!);
        return jsonResponse({
          conversation_id: conversation.id,
          intent: result.intent || pendingState.pending_intent,
          response: result.response,
          pending_resolved: true,
        });
      }
    }

    // 4. Identify customer
    let customerId = conversation.customer_id;
    let customerName = conversation.metadata?.customer_name || null;

    if (!customerId) {
      const identResult = await identifyCustomer(supabase, conversation, normalizedPhone, message, inboundMsg?.id);
      if (identResult.needsMore) {
        await storeOutbound(supabase, conversation.id, identResult.response!);
        await sendWhatsAppMessage(normalizedPhone, identResult.response!);
        return jsonResponse({ conversation_id: conversation.id, response: identResult.response, customer_status: identResult.status });
      }
      customerId = identResult.customerId;
      customerName = identResult.customerName;
    }

    if (!customerId) {
      const fallback = "Olá! Não conseguimos identificar seu cadastro. Por favor, informe seu CPF, ou o número da sua ordem de serviço (ex: OS-000123), para que possamos atendê-lo(a).";
      await createPendingState(supabase, conversation.id, "waiting_customer_identification", null, null, null, fallback, {});
      await logAiAction(supabase, conversation.id, inboundMsg?.id, "customer_identification", { phone: normalizedPhone }, { found: false }, false);
      await storeOutbound(supabase, conversation.id, fallback);
      await sendWhatsAppMessage(normalizedPhone, fallback);
      return jsonResponse({ conversation_id: conversation.id, response: fallback, customer_status: "unknown" });
    }

    // 5. AI classification
    let responseText: string;
    let intent = "unknown_intent";
    let confidence = 0;

    if (!lovableApiKey) {
      responseText = "Olá! Nosso assistente está temporariamente indisponível. Um atendente entrará em contato em breve.";
      await createHandoff(supabase, conversation.id, "ai_unavailable");
    } else {
      const context = await gatherBusinessContext(supabase, customerId);
      const aiResult = await classifyAndRespond(lovableApiKey, message, customerName || "Cliente", context, conversation.id);
      intent = aiResult.intent;
      confidence = aiResult.confidence;
      responseText = aiResult.response;

      // === SAFE APPROVAL/REJECTION: TWO-STEP ===
      if (intent === "approve_quote" || intent === "reject_quote") {
        const decision = intent === "approve_quote" ? "approved" : "rejected";
        const sentQuotes = (context.quotes || []).filter((q: any) => q.status === "sent");

        if (sentQuotes.length === 0) {
          responseText = "Não encontramos um orçamento pendente de aprovação no seu cadastro.";
        } else if (sentQuotes.length === 1) {
          const q = sentQuotes[0];
          const actionLabel = decision === "approved" ? "APROVAR" : "RECUSAR";
          const confirmMsg = `Você deseja ${actionLabel} o orçamento *${q.quote_number}* (OS ${q.order_number || "N/A"}) no valor de *R$ ${Number(q.total_amount).toFixed(2)}*?\n\nResponda *SIM* para confirmar ou *NÃO* para cancelar.`;
          await createPendingState(supabase, conversation.id,
            decision === "approved" ? "waiting_approval_confirmation" : "waiting_rejection_confirmation",
            intent, "quote", q.id, confirmMsg, { quote_number: q.quote_number, total_amount: q.total_amount, order_number: q.order_number });
          responseText = confirmMsg;
        } else {
          // Multiple quotes - ask to choose
          let choiceMsg = "Encontrei mais de um orçamento pendente:\n\n";
          sentQuotes.forEach((q: any, i: number) => {
            choiceMsg += `${i + 1}. ${q.quote_number} — R$ ${Number(q.total_amount).toFixed(2)}\n`;
          });
          choiceMsg += "\nResponda com o número da opção ou com o número do orçamento.";
          await createPendingState(supabase, conversation.id,
            "waiting_quote_selection", intent, "quote", null, choiceMsg, { quotes: sentQuotes, original_intent: intent });
          responseText = choiceMsg;
        }
      }
      // === MULTIPLE ORDERS FLOW ===
      else if (["check_service_order_status", "check_ready_for_pickup", "check_delivery_status", "check_device_info"].includes(intent)) {
        const activeOrders = (context.orders || []).filter((o: any) => !["delivered", "cancelled"].includes(o.status));
        if (activeOrders.length > 1) {
          let choiceMsg = "Encontrei mais de uma ordem de serviço em andamento:\n\n";
          activeOrders.forEach((o: any, i: number) => {
            choiceMsg += `${i + 1}. ${o.order_number} — ${o.device_label || "Dispositivo"} (${STATUS_LABELS[o.status] || o.status})\n`;
          });
          choiceMsg += "\nResponda com o número da opção ou com o número da OS.";
          await createPendingState(supabase, conversation.id,
            "waiting_order_selection", intent, "service_order", null, choiceMsg, { orders: activeOrders, original_intent: intent });
          responseText = choiceMsg;
        }
      }
      // === OTHER ACTIONS (non-quote) ===
      else if (aiResult.action && aiResult.action !== "approve_quote" && aiResult.action !== "reject_quote") {
        const actionResult = await executeAction(supabase, aiResult.action, customerId, context, conversation.id, inboundMsg?.id);
        if (actionResult.response) responseText = actionResult.response;
      }

      // Escalation
      if (intent === "ask_for_human" || confidence < 0.4) {
        await createHandoff(supabase, conversation.id, intent === "ask_for_human" ? "customer_request" : "low_confidence");
        if (intent === "ask_for_human") {
          responseText = "Entendido! Estou encaminhando você para um atendente humano. Por favor, aguarde um momento. 🙏";
        }
      }

      await logAiAction(supabase, conversation.id, inboundMsg?.id, "intent_classification",
        { message, intent, confidence }, { response: responseText.substring(0, 200) }, true);
    }

    await supabase.from("whatsapp_messages").update({ intent, confidence }).eq("id", inboundMsg?.id);
    await storeOutbound(supabase, conversation.id, responseText);
    const sendResult = await sendWhatsAppMessage(normalizedPhone, responseText);

    return jsonResponse({
      conversation_id: conversation.id,
      customer_id: customerId,
      intent,
      confidence,
      response: responseText,
      delivery: sendResult,
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ===== HELPERS =====

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "").replace(/^\+?55/, "55");
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== RATE LIMITING =====

async function checkRateLimit(supabase: any, phone: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("direction", "inbound")
    .gte("created_at", since)
    .limit(RATE_LIMIT_MAX + 1);
  // We check by conversation phone via join — simplified: count all recent inbound
  return (count ?? 0) < RATE_LIMIT_MAX;
}

// ===== CONVERSATION MANAGEMENT =====

async function getOrCreateConversation(supabase: any, phone: string) {
  const { data: existing } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone", phone)
    .in("status", ["active", "bot_active", "waiting_human", "human_active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (existing) return existing;

  const { data: newConv } = await supabase
    .from("whatsapp_conversations")
    .insert({ phone, status: "bot_active", metadata: {} })
    .select()
    .single();
  return newConv;
}

// ===== PENDING STATE MANAGEMENT =====

async function getActivePendingState(supabase: any, conversationId: string) {
  const { data } = await supabase
    .from("whatsapp_pending_states")
    .select("*")
    .eq("conversation_id", conversationId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function createPendingState(supabase: any, conversationId: string, pendingIntent: string, pendingAction: string | null, entityType: string | null, entityId: string | null, question: string, context: any) {
  // Clear old states for this conversation
  await supabase.from("whatsapp_pending_states").delete().eq("conversation_id", conversationId);
  await supabase.from("whatsapp_pending_states").insert({
    conversation_id: conversationId,
    pending_intent: pendingIntent,
    pending_action: pendingAction,
    pending_entity_type: entityType,
    pending_entity_id: entityId,
    pending_question: question,
    pending_context: context,
    expires_at: new Date(Date.now() + PENDING_STATE_TTL_MINUTES * 60_000).toISOString(),
  });
}

async function clearPendingState(supabase: any, conversationId: string) {
  await supabase.from("whatsapp_pending_states").delete().eq("conversation_id", conversationId);
}

// ===== HANDLE PENDING STATE RESPONSES =====

async function handlePendingState(supabase: any, conversation: any, state: any, message: string, msgId: string | null, apiKey: string | null): Promise<{ handled: boolean; response?: string; intent?: string }> {
  const normalizedMsg = message.trim().toLowerCase();

  // --- CUSTOMER IDENTIFICATION ---
  if (state.pending_intent === "waiting_customer_identification") {
    return await handleIdentificationResponse(supabase, conversation, message, msgId);
  }

  // --- APPROVAL CONFIRMATION ---
  if (state.pending_intent === "waiting_approval_confirmation") {
    if (CONFIRMATION_WORDS.some(w => normalizedMsg.includes(w))) {
      const ctx = state.pending_context;
      try {
        const { data: result, error } = await supabase.rpc("approve_reject_quote", {
          _quote_id: state.pending_entity_id,
          _decision: "approved",
          _decided_by_name: "WhatsApp",
          _decided_by_role: "customer",
          _reason: "Aprovado via WhatsApp conversacional",
        });
        if (error) throw error;
        await logAiAction(supabase, conversation.id, msgId, "approve_quote", { quote_id: state.pending_entity_id }, result, true);
        await clearPendingState(supabase, conversation.id);
        return { handled: true, intent: "approve_quote", response: `✅ Orçamento *${ctx.quote_number}* no valor de *R$ ${Number(ctx.total_amount).toFixed(2)}* aprovado com sucesso! Daremos andamento ao reparo.` };
      } catch (err: any) {
        await logAiAction(supabase, conversation.id, msgId, "approve_quote", { quote_id: state.pending_entity_id }, { error: err.message }, false);
        await clearPendingState(supabase, conversation.id);
        return { handled: true, response: "Houve um erro ao processar a aprovação. Por favor, tente novamente ou entre em contato pelo portal." };
      }
    }
    if (REJECTION_WORDS.some(w => normalizedMsg.includes(w)) || normalizedMsg === "cancelar") {
      await clearPendingState(supabase, conversation.id);
      return { handled: true, response: "Ok, a aprovação foi cancelada. O orçamento permanece pendente." };
    }
    return { handled: true, response: `Por favor, responda *SIM* para confirmar a aprovação ou *NÃO* para cancelar.` };
  }

  // --- REJECTION CONFIRMATION ---
  if (state.pending_intent === "waiting_rejection_confirmation") {
    if (CONFIRMATION_WORDS.some(w => normalizedMsg.includes(w)) || REJECTION_WORDS.some(w => normalizedMsg === w)) {
      const ctx = state.pending_context;
      try {
        const { data: result, error } = await supabase.rpc("approve_reject_quote", {
          _quote_id: state.pending_entity_id,
          _decision: "rejected",
          _decided_by_name: "WhatsApp",
          _decided_by_role: "customer",
          _reason: "Recusado via WhatsApp conversacional",
        });
        if (error) throw error;
        await logAiAction(supabase, conversation.id, msgId, "reject_quote", { quote_id: state.pending_entity_id }, result, true);
        await clearPendingState(supabase, conversation.id);
        return { handled: true, intent: "reject_quote", response: `Orçamento *${ctx.quote_number}* foi recusado. Entraremos em contato sobre os próximos passos.` };
      } catch (err: any) {
        await logAiAction(supabase, conversation.id, msgId, "reject_quote", { quote_id: state.pending_entity_id }, { error: err.message }, false);
        await clearPendingState(supabase, conversation.id);
        return { handled: true, response: "Houve um erro ao processar a recusa. Por favor, tente novamente." };
      }
    }
    if (normalizedMsg === "cancelar") {
      await clearPendingState(supabase, conversation.id);
      return { handled: true, response: "Ok, a recusa foi cancelada. O orçamento permanece pendente." };
    }
    return { handled: true, response: `Por favor, responda *SIM* para confirmar a recusa ou *CANCELAR* para desistir.` };
  }

  // --- QUOTE SELECTION ---
  if (state.pending_intent === "waiting_quote_selection") {
    const quotes = state.pending_context?.quotes || [];
    const originalIntent = state.pending_context?.original_intent;
    const selected = resolveSelection(quotes, message, "quote_number");
    if (selected) {
      await clearPendingState(supabase, conversation.id);
      const decision = originalIntent === "approve_quote" ? "approved" : "rejected";
      const actionLabel = decision === "approved" ? "APROVAR" : "RECUSAR";
      const confirmMsg = `Você deseja ${actionLabel} o orçamento *${selected.quote_number}* no valor de *R$ ${Number(selected.total_amount).toFixed(2)}*?\n\nResponda *SIM* para confirmar ou *NÃO* para cancelar.`;
      await createPendingState(supabase, conversation.id,
        decision === "approved" ? "waiting_approval_confirmation" : "waiting_rejection_confirmation",
        originalIntent, "quote", selected.id, confirmMsg, selected);
      return { handled: true, response: confirmMsg };
    }
    return { handled: true, response: "Não entendi. Responda com o número da opção (1, 2...) ou com o número do orçamento (ex: ORC-000123)." };
  }

  // --- ORDER SELECTION ---
  if (state.pending_intent === "waiting_order_selection") {
    const orders = state.pending_context?.orders || [];
    const selected = resolveSelection(orders, message, "order_number");
    if (selected) {
      await clearPendingState(supabase, conversation.id);
      const statusLabel = STATUS_LABELS[selected.status] || selected.status;
      return { handled: true, intent: state.pending_context?.original_intent, response: `📋 *${selected.order_number}* — ${selected.device_label || "Dispositivo"}\nStatus: *${statusLabel}*` };
    }
    return { handled: true, response: "Não entendi. Responda com o número da opção (1, 2...) ou com o número da OS (ex: OS-000123)." };
  }

  return { handled: false };
}

function resolveSelection(items: any[], message: string, numberField: string): any | null {
  const trimmed = message.trim();
  // Try numeric index
  const num = parseInt(trimmed);
  if (!isNaN(num) && num >= 1 && num <= items.length) return items[num - 1];
  // Try by identifier
  const upper = trimmed.toUpperCase();
  return items.find((item: any) => item[numberField]?.toUpperCase() === upper) || null;
}

// ===== CUSTOMER IDENTIFICATION =====

async function identifyCustomer(supabase: any, conversation: any, phone: string, message: string, msgId: string | null) {
  const { data: lookupResult } = await supabase.rpc("wa_lookup_customer", { _phone: phone });

  if (lookupResult?.count === 1) {
    const cust = lookupResult.customers[0];
    await supabase.from("whatsapp_conversations")
      .update({ customer_id: cust.id, metadata: { customer_name: cust.full_name } })
      .eq("id", conversation.id);
    return { needsMore: false, customerId: cust.id, customerName: cust.full_name };
  }

  if (lookupResult?.count > 1) {
    const response = "Encontramos mais de um cadastro para esse número. Por favor, informe seu CPF/CNPJ ou o número da sua OS (ex: OS-000123) para que possamos identificá-lo(a).";
    await createPendingState(supabase, conversation.id, "waiting_customer_identification", null, null, null, response, { ambiguous: true });
    return { needsMore: true, response, status: "ambiguous" };
  }

  // Try inline identification from the message
  const inlineResult = await tryInlineIdentification(supabase, conversation, message);
  if (inlineResult) return { needsMore: false, customerId: inlineResult.customerId, customerName: inlineResult.customerName };

  return { needsMore: false, customerId: null, customerName: null };
}

async function handleIdentificationResponse(supabase: any, conversation: any, message: string, msgId: string | null): Promise<{ handled: boolean; response?: string }> {
  const result = await tryInlineIdentification(supabase, conversation, message);
  if (result) {
    await clearPendingState(supabase, conversation.id);
    return { handled: true, response: `✅ Identificamos seu cadastro, *${result.customerName}*! Como posso ajudá-lo(a)?` };
  }
  return { handled: true, response: "Não conseguimos localizar com essa informação. Tente informar seu CPF/CNPJ completo ou o número da OS (ex: OS-000123)." };
}

async function tryInlineIdentification(supabase: any, conversation: any, message: string): Promise<{ customerId: string; customerName: string } | null> {
  const trimmed = message.trim().toUpperCase();

  // Try OS number
  const osMatch = trimmed.match(/OS[- ]?(\d+)/i);
  if (osMatch) {
    const orderNum = "OS-" + osMatch[1].padStart(6, "0");
    const { data } = await supabase.rpc("wa_lookup_by_order_number", { _order_number: orderNum });
    if (data) {
      await bindCustomer(supabase, conversation.id, data.customer_id, data.customer_name);
      return { customerId: data.customer_id, customerName: data.customer_name };
    }
  }

  // Try quote number
  const orcMatch = trimmed.match(/ORC[- ]?(\d+)/i);
  if (orcMatch) {
    const quoteNum = "ORC-" + orcMatch[1].padStart(6, "0");
    const { data } = await supabase.rpc("wa_lookup_by_quote_number", { _quote_number: quoteNum });
    if (data) {
      await bindCustomer(supabase, conversation.id, data.customer_id, data.customer_name);
      return { customerId: data.customer_id, customerName: data.customer_name };
    }
  }

  // Try CPF/CNPJ (digits only, 11 or 14 chars)
  const digitsOnly = message.replace(/[.\-\/\s]/g, "");
  if (/^\d{11}$/.test(digitsOnly) || /^\d{14}$/.test(digitsOnly)) {
    const { data } = await supabase.rpc("wa_lookup_customer_by_document", { _document: digitsOnly });
    if (data) {
      await bindCustomer(supabase, conversation.id, data.id, data.full_name);
      return { customerId: data.id, customerName: data.full_name };
    }
  }

  return null;
}

async function bindCustomer(supabase: any, conversationId: string, customerId: string, customerName: string) {
  await supabase.from("whatsapp_conversations")
    .update({ customer_id: customerId, metadata: { customer_name: customerName } })
    .eq("id", conversationId);
}

// ===== MESSAGES & LOGGING =====

async function storeOutbound(supabase: any, conversationId: string, text: string) {
  await supabase.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    message_type: "text",
    text_content: text,
  });
}

async function logAiAction(supabase: any, convId: string, msgId: string | null, actionType: string, actionPayload: any, resultPayload: any, success: boolean) {
  await supabase.from("whatsapp_ai_actions").insert({
    conversation_id: convId,
    message_id: msgId,
    action_type: actionType,
    action_payload: actionPayload,
    result_payload: resultPayload,
    success,
  });
}

// ===== HANDOFF =====

async function createHandoff(supabase: any, convId: string, reason: string) {
  const { data: existing } = await supabase
    .from("whatsapp_handoffs")
    .select("id")
    .eq("conversation_id", convId)
    .in("status", ["pending", "assigned", "active"])
    .limit(1);
  if (existing?.length > 0) return;

  await supabase.from("whatsapp_handoffs").insert({
    conversation_id: convId,
    requested_by: "customer",
    reason,
    status: "pending",
  });
  await supabase.from("whatsapp_conversations")
    .update({ status: "waiting_human", current_handoff_state: "pending" })
    .eq("id", convId);
}

// ===== BUSINESS CONTEXT =====

async function gatherBusinessContext(supabase: any, customerId: string) {
  const [orders, quotes, balance, warranties, logistics] = await Promise.all([
    supabase.rpc("wa_get_customer_orders", { _customer_id: customerId }),
    supabase.rpc("wa_get_customer_quotes", { _customer_id: customerId }),
    supabase.rpc("wa_get_customer_balance", { _customer_id: customerId }),
    supabase.rpc("wa_get_customer_warranties", { _customer_id: customerId }),
    supabase.rpc("wa_get_customer_logistics", { _customer_id: customerId }),
  ]);
  return {
    orders: orders.data || [],
    quotes: quotes.data || [],
    balance: balance.data || {},
    warranties: warranties.data || [],
    logistics: logistics.data || [],
  };
}

const STATUS_LABELS: Record<string, string> = {
  received: "Recebido", triage: "Triagem", awaiting_diagnosis: "Aguardando Diagnóstico",
  awaiting_quote: "Aguardando Orçamento", awaiting_customer_approval: "Aguardando Aprovação",
  awaiting_parts: "Aguardando Peças", in_repair: "Em Reparo", in_testing: "Em Teste",
  ready_for_pickup: "Pronto p/ Retirada", delivered: "Entregue", cancelled: "Cancelado",
  warranty_return: "Retorno Garantia",
};

// ===== AI CLASSIFICATION =====

async function classifyAndRespond(apiKey: string, message: string, customerName: string, context: any, conversationId: string) {
  const systemPrompt = `Você é o assistente virtual da i9 Solution, uma assistência técnica de eletrônicos.
Seu objetivo é ajudar clientes a consultar informações sobre seus serviços de forma clara e objetiva.

REGRAS ABSOLUTAS:
- Responda APENAS com dados fornecidos no contexto. NUNCA invente informações.
- Mantenha respostas curtas (máximo 3 parágrafos).
- Use linguagem cordial e profissional em português brasileiro.
- Se não tiver certeza, sugira falar com um atendente.
- NUNCA revele informações internas, custos, margens ou notas internas.
- Para aprovação/recusa de orçamento, APENAS classifique a intenção. NÃO execute a ação. O sistema cuidará da confirmação.

STATUS LABELS: ${JSON.stringify(STATUS_LABELS)}

CONTEXTO DO CLIENTE (${customerName}):
Ordens de serviço: ${JSON.stringify(context.orders)}
Orçamentos: ${JSON.stringify(context.quotes)}
Saldo financeiro: ${JSON.stringify(context.balance)}
Garantias: ${JSON.stringify(context.warranties)}
Logística: ${JSON.stringify(context.logistics)}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_intent",
            description: "Classify the customer intent and generate a response",
            parameters: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: [
                    "check_service_order_status", "check_ready_for_pickup", "check_delivery_status",
                    "check_device_info", "check_quote_status", "check_quote_amount",
                    "approve_quote", "reject_quote", "check_open_balance", "check_payment_status",
                    "check_pickup_status", "check_warranty_status", "request_warranty_return",
                    "greeting", "ask_for_human", "unknown_intent"
                  ],
                },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                response: { type: "string", description: "The response to send to the customer in Portuguese" },
                action: {
                  type: "string",
                  enum: ["approve_quote", "reject_quote", "request_handoff", "none"],
                },
              },
              required: ["intent", "confidence", "response"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_intent" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return { intent: "unknown_intent", confidence: 0, response: "Nosso assistente está temporariamente sobrecarregado. Tente novamente em alguns instantes ou peça para falar com um atendente.", action: null };
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        intent: parsed.intent || "unknown_intent",
        confidence: parsed.confidence || 0.5,
        response: parsed.response || "Desculpe, não entendi. Poderia reformular?",
        action: parsed.action !== "none" ? parsed.action : null,
      };
    }

    const content = data.choices?.[0]?.message?.content;
    return { intent: "unknown_intent", confidence: 0.5, response: content || "Desculpe, não consegui processar sua mensagem. Deseja falar com um atendente?", action: null };
  } catch (err) {
    console.error("AI classification error:", err);
    return { intent: "unknown_intent", confidence: 0, response: "Tivemos um problema ao processar sua mensagem. Um atendente poderá ajudá-lo(a). Deseja ser transferido?", action: null };
  }
}

// ===== ACTION EXECUTION (non-quote) =====

async function executeAction(supabase: any, action: string, customerId: string, context: any, convId: string, msgId: string | null) {
  if (action === "request_handoff") {
    await createHandoff(supabase, convId, "customer_request_via_ai");
    return { response: "Estou transferindo para um atendente humano. Por favor, aguarde. 🙏" };
  }
  return {};
}

// ===== WHATSAPP PROVIDER =====

async function sendWhatsAppMessage(phone: string, message: string) {
  const apiKey = Deno.env.get("WHATSAPP_API_KEY");
  const apiUrl = Deno.env.get("WHATSAPP_API_URL");

  if (!apiKey || !apiUrl) {
    console.log(`[DEV] WhatsApp message to ${phone}: ${message.substring(0, 100)}...`);
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
