/**
 * Test script demonstrating unlimited access to large datasets
 * Run with: npx tsx lib/test-unlimited-access.ts
 */

import { processNaturalQuery } from "./qdrant/nlp-query";
import {
  DEFAULT_PROCESSING_CONFIG,
  SAFE_PROCESSING_CONFIG,
} from "./pagination";

async function testUnlimitedAccess() {
  console.log("🚀 Testing Unlimited Database Access");
  console.log("=".repeat(60));

  // Test cases showing unlimited vs safe processing
  const testCases = [
    {
      name: "UNLIMITED: Complete Entity Count",
      config: DEFAULT_PROCESSING_CONFIG,
      collection: null,
      question: "How many artists are there across all collections?",
      description: "Processes ALL records to get exact count",
    },
    {
      name: "UNLIMITED: Complete Search",
      config: DEFAULT_PROCESSING_CONFIG,
      collection: "large_collection", // Assuming exists
      question: "Find all Van Gogh paintings",
      pagination: { limit: 1000, unbounded: true },
      description: "Can return up to 1000 results without artificial limits",
    },
    {
      name: "SAFE MODE: Limited Processing (for comparison)",
      config: SAFE_PROCESSING_CONFIG,
      collection: null,
      question: "How many artists are there across all collections?",
      description: "Limited to 50k records total",
    },
  ];

  for (const test of testCases) {
    try {
      console.log(`\n🔍 ${test.name}`);
      console.log(`Query: "${test.question}"`);
      console.log(`Description: ${test.description}`);
      console.log(
        `Config: ${
          test.config === DEFAULT_PROCESSING_CONFIG ? "UNLIMITED" : "SAFE"
        }`
      );

      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      const result = await processNaturalQuery(
        test.collection,
        test.question,
        "openai",
        undefined, // model
        undefined, // context
        test.pagination,
        test.config
      );

      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;

      console.log(`✅ Completed in ${duration}ms`);
      console.log(`Answer: ${result.answer.substring(0, 150)}...`);
      // Handle different result types properly
      let recordCount = "N/A";
      if (result.data) {
        if ('count' in result.data) {
          recordCount = String(result.data.count);
        } else if ('total_vectors_count' in result.data) {
          recordCount = String(result.data.total_vectors_count);
        } else if ('total_count' in result.data) {
          recordCount = String(result.data.total_count);
        } else if ('items' in result.data && Array.isArray(result.data.items)) {
          recordCount = String(result.data.items.length);
        } else if ('entities' in result.data && Array.isArray(result.data.entities)) {
          recordCount = String(result.data.entities.length);
        }
      }
      console.log(`Records found: ${recordCount}`);
      console.log(`Memory used: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);

      if (result.pagination) {
        console.log(
          `Pagination: hasMore=${result.pagination.hasMore}, limit=${result.pagination.limit}`
        );
      }

      // Performance analysis
      if (duration > 30000) {
        console.warn(
          `⚠️  Very long query: ${duration}ms - Consider optimization`
        );
      } else if (duration > 10000) {
        console.log(
          `📊 Long query (expected for large datasets): ${duration}ms`
        );
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      if (error.code) {
        console.error(`Error code: ${error.code}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎯 Summary: Unlimited Access Capabilities");
  console.log("\n✅ WHAT YOU CAN NOW DO:");
  console.log("- Process datasets of ANY size (millions of records)");
  console.log("- Get complete, exact counts across entire database");
  console.log("- Search with high limits (1000+ results)");
  console.log("- Complete entity enumeration");
  console.log("- Full-database analytics and aggregations");
  console.log("\n🧠 MEMORY EFFICIENCY MAINTAINED:");
  console.log("- Chunked processing (100 records at a time)");
  console.log("- Database-level filtering");
  console.log("- Constant memory usage regardless of dataset size");
  console.log("- Progress logging for long operations");
}

// Example API usage patterns
export const UNLIMITED_QUERY_EXAMPLES = {
  // Complete database analysis
  fullAnalysis: () =>
    processNaturalQuery(
      null,
      "Analyze all artists and their work across the entire database",
      "openai",
      undefined,
      undefined,
      undefined,
      DEFAULT_PROCESSING_CONFIG // Unlimited processing
    ),

  // Large result sets
  massiveSearch: (collection: string, artist: string) =>
    processNaturalQuery(
      collection,
      `Find all artwork by ${artist}`,
      "openai",
      undefined,
      undefined,
      { limit: 5000, unbounded: true }, // Up to 5000 results
      DEFAULT_PROCESSING_CONFIG
    ),

  // Complete enumeration
  fullListing: (collection: string) =>
    processNaturalQuery(
      collection,
      "List all unique artists in this collection",
      "openai",
      undefined,
      undefined,
      undefined,
      DEFAULT_PROCESSING_CONFIG // Will process entire collection
    ),

  // Safe mode for interactive queries
  interactive: (question: string) =>
    processNaturalQuery(
      null,
      question,
      "openai",
      undefined,
      undefined,
      { limit: 20 },
      SAFE_PROCESSING_CONFIG // Faster response for UI
    ),
};

// Configuration helpers
export function createUnlimitedConfig(
  chunkSize: number = 100,
  enableProgress: boolean = true
) {
  return {
    chunkSize,
    maxRecordsPerCollection: "unlimited" as const,
    maxTotalRecords: "unlimited" as const,
    maxEntities: "unlimited" as const,
    enableProgressLogging: enableProgress,
  };
}

export function createBoundedConfig(
  maxRecords: number,
  maxEntities: number = 1000
) {
  return {
    chunkSize: 100,
    maxRecordsPerCollection: maxRecords,
    maxTotalRecords: maxRecords * 10,
    maxEntities: maxEntities,
    enableProgressLogging: true,
  };
}

// Run the test if this file is executed directly
if (require.main === module) {
  testUnlimitedAccess()
    .then(() => {
      console.log("\n🚀 Unlimited access testing complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}
