export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  // If neither page nor limit is provided, return null-like sentinel so callers can skip pagination
  if (!pageParam && !limitParam) {
    return { page: 0, limit: 0, offset: 0 };
  }

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "25", 10) || 25));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginationMeta(
  params: PaginationParams,
  total: number,
): PaginationMeta | null {
  // If pagination wasn't requested, return null
  if (params.page === 0) return null;

  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}
