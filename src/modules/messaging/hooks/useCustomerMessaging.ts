import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanyName } from "@/hooks/useCompanyName";
import { executePaginatedQuery, type PaginationParams } from "@/hooks/usePaginatedQuery";
import type { PaginatedResult } from "@/components/ui/data-pagination";

const db = supabase as any;

// ── Template rendering ──
function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value || "");
  }
  return result;
}

// ── Fetch a template by key ──
async function getTemplate(templateKey: string): Promise<string | null> {
  const { data } = await db
    .from("notification_templates")
    .select("body")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();
  return data?.body || null;
}

// ── Check for duplicate auto-send ──
async function isDuplicate(referenceType: string, referenceId: string, eventType: string, templateKey: string): Promise<boolean> {
  const { data } = await db
    .from("customer_message_events")
    .select("id")
    .eq("reference_type", referenceType)
    .eq("reference_id", referenceId)
    .eq("event_type", eventType)
    .eq("template_key", templateKey)
    .eq("sent_automatically", true)
    .limit(1);
  return (data?.length || 0) > 0;
}

// ── Core send function ──
async function sendCustomerMessage(params: {
  customerId?: string | null;
  phone: string;
  eventType: string;
  referenceType: string;
  referenceId: string;
  templateKey: string;
  variables: Record<string, string>;
  automatic: boolean;
  userId?: string | null;
}): Promise<{ success: boolean; message: string }> {
  const { customerId, phone, eventType, referenceType, referenceId, templateKey, variables, automatic, userId } = params;

  // Check duplicate for auto-send
  if (automatic) {
    const dup = await isDuplicate(referenceType, referenceId, eventType, templateKey);
    if (dup) return { success: false, message: "Mensagem já enviada para este evento." };
  }

  // Get template
  const templateBody = await getTemplate(templateKey);
  if (!templateBody) return { success: false, message: `Template "${templateKey}" não encontrado ou inativo.` };

  const messageText = renderTemplate(templateBody, variables);

  // Log the message event
  const { data: event, error: insertErr } = await db.from("customer_message_events").insert({
    customer_id: customerId || null,
    phone,
    event_type: eventType,
    reference_type: referenceType,
    reference_id: referenceId,
    template_key: templateKey,
    message_text: messageText,
    delivery_status: "pending",
    sent_automatically: automatic,
    created_by: userId || null,
  }).select().single();

  if (insertErr) {
    // Unique constraint violation = duplicate
    if (insertErr.code === "23505") return { success: false, message: "Mensagem já enviada para este evento." };
    throw insertErr;
  }

  // Send via existing WhatsApp infrastructure (notification_queue)
  const { error: queueErr } = await db.from("notification_queue").insert({
    channel: "whatsapp",
    recipient_address: phone,
    recipient_name: variables.customer_name || "Cliente",
    rendered_body: messageText,
    status: "pending",
    next_attempt_at: new Date().toISOString(),
    payload: { customer_message_event_id: event.id, event_type: eventType, reference_type: referenceType, reference_id: referenceId },
  });

  if (queueErr) {
    await db.from("customer_message_events")
      .update({ delivery_status: "failed", error_message: queueErr.message })
      .eq("id", event.id);
    return { success: false, message: queueErr.message };
  }

  await db.from("customer_message_events")
    .update({ delivery_status: "sent" })
    .eq("id", event.id);

  return { success: true, message: messageText };
}

// ── Hook: Send customer message ──
export function useSendCustomerMessage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyName = useCompanyName();

  return useMutation({
    mutationFn: async (params: {
      customerId?: string | null;
      phone: string;
      eventType: string;
      referenceType: string;
      referenceId: string;
      templateKey: string;
      variables: Record<string, string>;
      automatic?: boolean;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      return sendCustomerMessage({
        ...params,
        variables: { ...params.variables, company_name: companyName },
        automatic: params.automatic ?? false,
        userId,
      });
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["customer-message-events"] });
      if (result.success) {
        toast({ title: "Mensagem enviada!", description: "Comprovante enviado via WhatsApp." });
      } else {
        toast({ title: "Aviso", description: result.message });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar mensagem", description: err.message, variant: "destructive" });
    },
  });
}

// ── Hook: Auto-send (non-blocking, fire-and-forget) ──
export function useAutoSendMessage() {
  const companyName = useCompanyName("i9 Solutions");

  return async (params: {
    customerId?: string | null;
    phone: string;
    eventType: string;
    referenceType: string;
    referenceId: string;
    templateKey: string;
    variables: Record<string, string>;
  }) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await sendCustomerMessage({
        ...params,
        variables: { ...params.variables, company_name: companyName },
        automatic: true,
        userId,
      });
    } catch (err) {
      console.warn("[AutoSend] Failed:", err);
    }
  };
}

// ── Hook: Message history (paginated) ──
export function useCustomerMessageEvents(
  filters?: { eventType?: string; status?: string; customerId?: string },
  page: number = 1,
) {
  return useQuery<PaginatedResult<any>>({
    queryKey: ["customer-message-events", filters, page],
    queryFn: async () => {
      return executePaginatedQuery<any>({ page }, {
        table: "customer_message_events",
        select: "*, customers(full_name)",
        defaultSort: { column: "created_at", ascending: false },
        additionalFilters: (q: any) => {
          let query = q;
          if (filters?.eventType) query = query.eq("event_type", filters.eventType);
          if (filters?.status) query = query.eq("delivery_status", filters.status);
          if (filters?.customerId) query = query.eq("customer_id", filters.customerId);
          return query;
        },
        countFilters: (q: any) => {
          let query = q;
          if (filters?.eventType) query = query.eq("event_type", filters.eventType);
          if (filters?.status) query = query.eq("delivery_status", filters.status);
          if (filters?.customerId) query = query.eq("customer_id", filters.customerId);
          return query;
        },
      });
    },
  });
}

// ── Hook: Messages for a specific reference ──
export function useReferenceMessages(referenceType: string, referenceId: string | undefined) {
  return useQuery({
    queryKey: ["customer-message-events", referenceType, referenceId],
    enabled: !!referenceId,
    queryFn: async () => {
      const { data, error } = await db
        .from("customer_message_events")
        .select("*")
        .eq("reference_type", referenceType)
        .eq("reference_id", referenceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ── Hook: Resend a message ──
export function useResendMessage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data: event, error } = await db
        .from("customer_message_events")
        .select("*")
        .eq("id", eventId)
        .single();
      if (error || !event) throw new Error("Evento não encontrado");

      // Re-queue the message
      const { error: queueErr } = await db.from("notification_queue").insert({
        channel: "whatsapp",
        recipient_address: event.phone,
        recipient_name: "Cliente",
        rendered_body: event.message_text,
        status: "pending",
        next_attempt_at: new Date().toISOString(),
        payload: { customer_message_event_id: event.id, resend: true },
      });

      if (queueErr) throw queueErr;

      await db.from("customer_message_events")
        .update({ delivery_status: "sent", error_message: null })
        .eq("id", eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-message-events"] });
      toast({ title: "Mensagem reenviada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao reenviar", description: err.message, variant: "destructive" });
    },
  });
}

// ── Render a message preview without sending ──
export async function previewMessage(templateKey: string, variables: Record<string, string>): Promise<string | null> {
  const body = await getTemplate(templateKey);
  if (!body) return null;
  return renderTemplate(body, variables);
}
