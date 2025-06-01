export interface PaginationOptions {
  limit: number;
  offset?: string;
  maxLimit?: number;
  unbounded?: boolean; // Allow unlimited processing
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

export interface ProcessingConfig {
  chunkSize: number;
  maxRecordsPerCollection: number | "unlimited";
  maxTotalRecords: number | "unlimited";
  maxEntities: number | "unlimited";
  enableProgressLogging: boolean;
}

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  chunkSize: 100,
  maxRecordsPerCollection: "unlimited",
  maxTotalRecords: "unlimited",
  maxEntities: "unlimited",
  enableProgressLogging: true,
};

export const SAFE_PROCESSING_CONFIG: ProcessingConfig = {
  chunkSize: 100,
  maxRecordsPerCollection: 10000,
  maxTotalRecords: 50000,
  maxEntities: 1000,
  enableProgressLogging: true,
};

export function validatePagination(
  options: PaginationOptions
): PaginationOptions {
  // If unbounded is set, allow much higher limits
  const maxLimit = options.unbounded ? 10000 : options.maxLimit || 100;
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
  processingMode?: "unlimited" | "safe" | "paginated";
}

export function logQueryPerformance(metrics: QueryPerformanceMetrics): void {
  if (metrics.duration > 10000) {
    // Only warn on truly slow queries (10s+)
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

  // Log progress for large operations
  if (
    metrics.recordsProcessed > 10000 &&
    metrics.processingMode === "unlimited"
  ) {
    console.log(
      `📊 Processing: ${metrics.queryType} | Duration: ${metrics.duration}ms | Records: ${metrics.recordsProcessed} | Mode: ${metrics.processingMode}`
    );
  }

  // Log all queries in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `📊 Query: ${metrics.queryType} | Duration: ${metrics.duration}ms | Records: ${metrics.recordsProcessed} | Memory Efficient: ${metrics.memoryEfficient} | Mode: ${metrics.processingMode}`
    );
  }
}
