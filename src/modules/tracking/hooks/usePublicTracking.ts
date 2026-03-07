import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

export function usePublicTrackOrder(token: string | undefined) {
  return useQuery({
    queryKey: ["public-track", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await db.rpc("public_track_order", { _token: token });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as any;
    },
    refetchInterval: 30000,
  });
}

export function usePublicApproveRejectQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, quoteId, decision }: { token: string; quoteId: string; decision: string }) => {
      const { data, error } = await db.rpc("public_approve_reject_quote", {
        _token: token,
        _quote_id: quoteId,
        _decision: decision,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["public-track", vars.token] });
    },
  });
}

export function useServiceOrderPublicLinks(serviceOrderId: string | undefined) {
  return useQuery({
    queryKey: ["so-public-links", serviceOrderId],
    enabled: !!serviceOrderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("service_order_public_links")
        .select("*")
        .eq("service_order_id", serviceOrderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useGeneratePublicLink() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (serviceOrderId: string) => {
      const { data, error } = await db.rpc("generate_public_tracking_token", {
        _service_order_id: serviceOrderId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, serviceOrderId) => {
      qc.invalidateQueries({ queryKey: ["so-public-links", serviceOrderId] });
      toast({ title: "Link de acompanhamento gerado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao gerar link", description: err.message, variant: "destructive" });
    },
  });
}

export function useRevokePublicLink() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ linkId, serviceOrderId }: { linkId: string; serviceOrderId: string }) => {
      const { error } = await db
        .from("service_order_public_links")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", linkId);
      if (error) throw error;
      return serviceOrderId;
    },
    onSuccess: (serviceOrderId) => {
      qc.invalidateQueries({ queryKey: ["so-public-links", serviceOrderId] });
      toast({ title: "Link revogado!" });
    },
  });
}
