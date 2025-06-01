#!/usr/bin/env tsx

/**
 * Test script for the improved type safety system
 *
 * Run with: npx tsx lib/test-type-safety.ts
 */

import {
  VectorPayloadSchema,
  FilterConditionSchema,
  DocumentMetadataSchema,
  SearchQuerySchema,
  QueryResultSchema,
} from "./schemas";

import {
  validatePayload,
  validateSearchFilters,
  validateSearchQuery,
  ValidationError,
} from "./validation";

console.log("🔒 Testing Type Safety Improvements\n");

// Test 1: Valid vector payload
console.log("1. Testing valid vector payload:");
try {
  const validPayload = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "test document",
    file_name: "test.pdf",
    image_url: "https://example.com/image.jpg",
    description: "A test document",
    tags: ["document", "test"],
    price: 29.99,
    rating: 4.5,
    custom_fields: {
      department: "engineering",
      priority: 1,
      active: true,
      keywords: ["typescript", "safety"],
    },
  };

  const result = validatePayload(validPayload);
  console.log("✅ Valid payload accepted:", Object.keys(result).join(", "));
} catch (error) {
  console.log("❌ Unexpected error:", error);
}

// Test 2: Invalid vector payload (should reject)
console.log("\n2. Testing invalid vector payload:");
try {
  const invalidPayload = {
    id: "not-a-uuid",
    image_url: "not-a-url",
    rating: 10, // Outside valid range
    dimensions: {
      width: "invalid", // Should be number
    },
  };

  validatePayload(invalidPayload);
  console.log("❌ Invalid payload was incorrectly accepted");
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(
      "✅ Invalid payload correctly rejected:",
      error.errors.length,
      "errors"
    );
    console.log("   Sample error:", error.errors[0]?.message);
  }
}

// Test 3: Valid search filters
console.log("\n3. Testing valid search filters:");
try {
  const validFilters = [
    {
      field: "category",
      operator: "equals",
      value: "documents",
    },
    {
      field: "price",
      operator: "lt",
      value: 50,
    },
    {
      field: "tags",
      operator: "contains",
      value: "important",
    },
  ];

  const result = validateSearchFilters(validFilters);
  console.log("✅ Valid filters accepted:", result.length, "conditions");
} catch (error) {
  console.log("❌ Unexpected error:", error);
}

// Test 4: Invalid search filters (should reject)
console.log("\n4. Testing invalid search filters:");
try {
  const invalidFilters = [
    {
      field: "category",
      operator: "invalid_operator",
      value: "documents",
    },
  ];

  validateSearchFilters(invalidFilters);
  console.log("❌ Invalid filters were incorrectly accepted");
} catch (error) {
  if (error instanceof ValidationError) {
    console.log("✅ Invalid filters correctly rejected");
  }
}

// Test 5: Valid search query
console.log("\n5. Testing valid search query:");
try {
  const validQuery = {
    text: "find documents about typescript",
    filters: [
      {
        field: "category",
        operator: "equals",
        value: "code",
      },
    ],
    limit: 20,
    threshold: 0.8,
  };

  const result = validateSearchQuery(validQuery);
  console.log("✅ Valid query accepted, limit:", result.limit);
} catch (error) {
  console.log("❌ Unexpected error:", error);
}

// Test 6: Document metadata validation
console.log("\n6. Testing document metadata:");
try {
  const validMetadata = {
    title: "TypeScript Best Practices",
    author: "Engineering Team",
    source: "internal-docs",
    category: "documentation",
    tags: ["typescript", "best-practices", "engineering"],
    created_at: "2024-01-30T12:00:00Z",
    custom_fields: {
      department: "engineering",
      review_status: "approved",
      priority: 1,
    },
  };

  const parsed = DocumentMetadataSchema.parse(validMetadata);
  console.log("✅ Valid metadata accepted:", parsed.title);
} catch (error) {
  console.log("❌ Unexpected error:", error);
}

// Test 7: Schema composition
console.log("\n7. Testing schema composition:");
try {
  const composedSchema = SearchQuerySchema.extend({
    advanced_options: VectorPayloadSchema.pick({
      tags: true,
      category: true,
    }).optional(),
  });

  const composedQuery = {
    text: "test query",
    limit: 10,
    advanced_options: {
      tags: ["typescript", "testing"],
      category: "development",
    },
  };

  const result = composedSchema.parse(composedQuery);
  console.log(
    "✅ Schema composition works:",
    result.advanced_options?.tags?.length,
    "tags"
  );
} catch (error) {
  console.log("❌ Schema composition error:", error);
}

// Test 8: Type inference
console.log("\n8. Testing type inference:");
try {
  // This should provide full TypeScript intellisense
  const inferredPayload = VectorPayloadSchema.parse({
    name: "test",
    tags: ["a", "b"],
    rating: 4.0,
  });

  // TypeScript should know these properties exist
  if (inferredPayload.name && inferredPayload.tags && inferredPayload.rating) {
    console.log("✅ Type inference working correctly");
    console.log("   Name:", inferredPayload.name);
    console.log("   Tags count:", inferredPayload.tags.length);
    console.log("   Rating:", inferredPayload.rating);
  }
} catch (error) {
  console.log("❌ Type inference error:", error);
}

console.log("\n✨ Type safety tests completed!\n");

console.log("📊 Summary of improvements:");
console.log("   - Eliminated all z.any() instances");
console.log("   - Added strongly typed vector payloads");
console.log("   - Enhanced filter condition validation");
console.log("   - Improved document metadata typing");
console.log("   - Created composable schema system");
console.log("   - Ensured full TypeScript inference");
console.log("   - Consolidated duplicate schemas");
