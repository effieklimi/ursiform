export interface PaginationOptions {
  limit: number;
  offset?: string;
  maxLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextOffset?: string;
    totalCount?: number;
    limit: number;
  };
}

export function validatePagination(
  options: PaginationOptions
): PaginationOptions {
  const maxLimit = options.maxLimit || 100;
  return {
    ...options,
    limit: Math.min(Math.max(options.limit, 1), maxLimit),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  hasMore: boolean,
  nextOffset?: string,
  limit: number = 20,
  totalCount?: number
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      hasMore,
      nextOffset,
      totalCount,
      limit,
    },
  };
}

export interface QueryPerformanceMetrics {
  queryType: string;
  collection?: string;
  duration: number;
  recordsProcessed: number;
  memoryEfficient: boolean;
}

export function logQueryPerformance(metrics: QueryPerformanceMetrics): void {
  if (metrics.duration > 5000) {
    console.warn(
      `🐌 Slow query detected: ${metrics.duration}ms for ${
        metrics.queryType
      } on ${metrics.collection || "database"} (${
        metrics.recordsProcessed
      } records)`
    );
  }

  if (!metrics.memoryEfficient) {
    console.warn(
      `⚠️ Memory-intensive query: ${metrics.queryType} on ${
        metrics.collection || "database"
      }`
    );
  }

  // Log all queries in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `📊 Query: ${metrics.queryType} | Duration: ${metrics.duration}ms | Records: ${metrics.recordsProcessed} | Memory Efficient: ${metrics.memoryEfficient}`
    );
  }
}
