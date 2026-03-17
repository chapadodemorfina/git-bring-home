import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "@/components/ui/data-pagination";

const db = supabase as any;

export interface PaginationParams {
  page: number;
  pageSize?: number;
  search?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SupabasePaginatedQueryOptions {
  table: string;
  select?: string;
  searchColumns?: string[];
  defaultSort?: { column: string; ascending: boolean };
  additionalFilters?: (query: any) => any;
  /** Count query may differ from main query (e.g., when using !inner joins) */
  countSelect?: string;
  countFilters?: (query: any) => any;
}

/**
 * Executes a paginated query against Supabase with count.
 * Returns { items, total, page, pageSize, totalPages }.
 */
export async function executePaginatedQuery<T>(
  params: PaginationParams,
  options: SupabasePaginatedQueryOptions
): Promise<PaginatedResult<T>> {
  const pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
  const page = params.page;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build count query
  let countQuery = db.from(options.table).select(options.countSelect || "id", { count: "exact", head: true });

  // Build data query
  let dataQuery = db.from(options.table).select(options.select || "*");

  // Apply search
  if (params.search && options.searchColumns?.length) {
    const filter = options.searchColumns.map((col) => `${col}.ilike.%${params.search}%`).join(",");
    dataQuery = dataQuery.or(filter);
    countQuery = countQuery.or(filter);
  }

  // Apply equality filters
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value !== null && value !== undefined && value !== "") {
        dataQuery = dataQuery.eq(key, value);
        countQuery = countQuery.eq(key, value);
      }
    }
  }

  // Apply additional custom filters
  if (options.additionalFilters) {
    dataQuery = options.additionalFilters(dataQuery);
  }
  if (options.countFilters) {
    countQuery = options.countFilters(countQuery);
  } else if (options.additionalFilters) {
    countQuery = options.additionalFilters(countQuery);
  }

  // Apply sort
  const sort = params.sortBy
    ? { column: params.sortBy, ascending: params.sortOrder === "asc" }
    : options.defaultSort || { column: "created_at", ascending: false };
  dataQuery = dataQuery.order(sort.column, { ascending: sort.ascending });

  // Apply pagination range
  dataQuery = dataQuery.range(from, to);

  const [{ data, error }, { count }] = await Promise.all([dataQuery, countQuery]);
  if (error) throw error;

  const total = count || 0;
  return {
    items: (data || []) as T[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
