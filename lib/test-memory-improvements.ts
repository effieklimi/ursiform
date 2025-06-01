/**
 * Test script to verify memory improvements and pagination
 * Run with: npx tsx lib/test-memory-improvements.ts
 */

import { processNaturalQuery } from "./qdrant/nlp-query";
import { PaginationOptions } from "./pagination";

async function testMemoryImprovements() {
  console.log("🧪 Testing Memory Improvements and Pagination");
  console.log("=".repeat(50));

  const testQueries = [
    {
      name: "Count entities with pagination",
      collection: null, // Database-wide
      question: "How many artists are there?",
      pagination: { limit: 5 } as PaginationOptions,
    },
    {
      name: "Search items with pagination",
      collection: "test_collection", // Assuming a test collection exists
      question: "Find all images",
      pagination: { limit: 10 } as PaginationOptions,
    },
    {
      name: "List collections (no pagination needed)",
      collection: null,
      question: "What collections exist?",
    },
  ];

  for (const test of testQueries) {
    try {
      console.log(`\n🔍 ${test.name}`);
      console.log(`Query: "${test.question}"`);
      console.log(`Collection: ${test.collection || "database-wide"}`);
      console.log(
        `Pagination: ${
          test.pagination ? JSON.stringify(test.pagination) : "none"
        }`
      );

      const startMemory = process.memoryUsage();
      const startTime = Date.now();

      const result = await processNaturalQuery(
        test.collection,
        test.question,
        "openai", // provider
        undefined, // model
        undefined, // context
        test.pagination
      );

      const endMemory = process.memoryUsage();
      const duration = Date.now() - startTime;

      console.log(`✅ Success (${duration}ms)`);
      console.log(`Answer: ${result.answer.substring(0, 100)}...`);
      console.log(`Query type: ${result.query_type}`);
      console.log(
        `Data count: ${result.data?.count || result.data?.total_count || "N/A"}`
      );

      if (result.pagination) {
        console.log(
          `Pagination: hasMore=${result.pagination.hasMore}, limit=${result.pagination.limit}`
        );
      }

      // Memory usage comparison
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;
      const memoryDiffMB = (memoryDiff / 1024 / 1024).toFixed(2);
      console.log(`Memory change: ${memoryDiffMB}MB`);

      // Performance check
      if (duration > 5000) {
        console.warn(`⚠️  Slow query detected: ${duration}ms`);
      }

      if (Math.abs(memoryDiff) > 50 * 1024 * 1024) {
        // More than 50MB
        console.warn(`⚠️  High memory usage: ${memoryDiffMB}MB`);
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      if (error.code) {
        console.error(`Error code: ${error.code}`);
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🏁 Memory improvements testing complete");

  // Final memory report
  const finalMemory = process.memoryUsage();
  console.log("\n📊 Final Memory Usage:");
  console.log(
    `Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
  );
  console.log(
    `Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`
  );
  console.log(`RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`);
}

// Performance monitoring utility
export function monitorQueryPerformance() {
  const originalLog = console.log;
  const originalWarn = console.warn;

  let slowQueryCount = 0;
  let memoryWarningCount = 0;

  console.warn = (...args) => {
    const message = args.join(" ");
    if (message.includes("Slow query detected")) {
      slowQueryCount++;
    }
    if (message.includes("Memory-intensive query")) {
      memoryWarningCount++;
    }
    originalWarn.apply(console, args);
  };

  // Return cleanup function
  return () => {
    console.log = originalLog;
    console.warn = originalWarn;

    console.log("\n📈 Performance Summary:");
    console.log(`Slow queries detected: ${slowQueryCount}`);
    console.log(`Memory warnings: ${memoryWarningCount}`);

    if (slowQueryCount === 0 && memoryWarningCount === 0) {
      console.log("✅ All queries performed within acceptable limits");
    }
  };
}

// Run the test if this file is executed directly
if (require.main === module) {
  const cleanup = monitorQueryPerformance();

  testMemoryImprovements()
    .then(() => {
      cleanup();
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      cleanup();
      process.exit(1);
    });
}
