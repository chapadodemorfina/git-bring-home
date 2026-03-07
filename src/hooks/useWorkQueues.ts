import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface WorkQueueItem {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assigned_technician_id: string | null;
  collection_point_id: string | null;
  reported_issue: string | null;
  customer_name: string;
  device_label: string;
  technician_name: string | null;
  collection_point_name: string | null;
  target_hours: number | null;
  hours_in_status: number;
  sla_overdue: boolean;
}

export interface WorkQueueResult {
  items: WorkQueueItem[];
  total: number;
  page: number;
  page_size: number;
}

export type QueueType = "diagnosis" | "repair" | "testing" | "pickup" | null;

export function useWorkQueues(
  queue: QueueType = null,
  technicianId?: string | null,
  priority?: string | null,
  collectionPointOnly: boolean = false,
  page: number = 1,
  pageSize: number = 50,
) {
  return useQuery<WorkQueueResult>({
    queryKey: ["work-queues", queue, technicianId, priority, collectionPointOnly, page, pageSize],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_work_queues", {
        _queue: queue,
        _technician_id: technicianId || null,
        _priority: priority || null,
        _collection_point_only: collectionPointOnly,
        _page: page,
        _page_size: pageSize,
      });
      if (error) throw error;
      return data as WorkQueueResult;
    },
  });
}

export function useSlaConfigs() {
  return useQuery({
    queryKey: ["sla-configs"],
    queryFn: async () => {
      const { data, error } = await db
        .from("sla_configs")
        .select("*")
        .order("priority")
        .order("status");
      if (error) throw error;
      return data as { id: string; priority: string; status: string; target_hours: number }[];
    },
  });
}
