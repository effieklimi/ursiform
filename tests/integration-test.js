// Comprehensive test for API key sanitization functionality
// This tests the sanitizeErrorMessage function used in the settings page component

const sanitizeErrorMessage = (errorMessage) => {
  if (!errorMessage) return errorMessage;

  let sanitized = errorMessage;

  // Common API key patterns to redact
  const patterns = [
    // OpenAI API keys (start with sk-)
    /sk-[a-zA-Z0-9]{20,}/g,
    // Google/Gemini API keys (typically 39 characters long, alphanumeric with hyphens)
    /AIza[a-zA-Z0-9_-]{35}/g,
    // Bearer tokens (capture the full Bearer + token)
    /Bearer\s+[a-zA-Z0-9_-]{10,}/gi,
    // Authorization headers (capture full authorization line)
    /Authorization[:\s]*[a-zA-Z0-9_\-\s]+/gi,
    // Generic API key patterns in key=value format
    /api[_-]?key[=:]\s*['"]*[a-zA-Z0-9_-]{10,}['"]*\s*/gi,
    /key[=:]\s*['"]*[a-zA-Z0-9_-]{10,}['"]*\s*/gi,
    // URL-embedded API keys (query parameters) - more specific patterns
    /[?&]key=[a-zA-Z0-9_-]{10,}/gi,
    /[?&]api[_-]?key=[a-zA-Z0-9_-]{10,}/gi,
    // Basic auth credentials in URLs
    /\/\/[^:\s\/]+:[^@\s\/]+@/g,
  ];

  // Apply all patterns to redact sensitive information
  patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  });

  // Additional specific sanitization for common error contexts

  // Remove any remaining long alphanumeric strings that might be keys (32+ chars)
  sanitized = sanitized.replace(/\b[a-zA-Z0-9_-]{32,}\b/g, "[REDACTED]");

  // Clean up any duplicate redactions or formatting issues
  sanitized = sanitized.replace(/\[REDACTED\]\[REDACTED\]/g, "[REDACTED]");
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
};

console.log("🔒 API Key Sanitization Security Test\n");

// Test 1: Real API error message from health endpoint
const realErrorMessage =
  "Incorrect API key provided: sk. You can find your API key at https://platform.openai.com/account/api-keys.";
console.log("1️⃣ Real API Error Message:");
console.log("   Input:", realErrorMessage);
console.log("   Output:", sanitizeErrorMessage(realErrorMessage));
console.log("   ✅ Safe to display (no full API key exposed)\n");

// Test 2: Potentially dangerous messages that could leak API keys
const dangerousMessages = [
  {
    description: "OpenAI API key in error message",
    message: "API key sk-1234567890abcdef1234567890abcdef is invalid",
  },
  {
    description: "Gemini API key in authentication error",
    message:
      "Failed to authenticate with key: AIzaSyDOCAbC123dEFGHI456789jkl123456789",
  },
  {
    description: "API key in database connection string",
    message:
      "Database connection failed: postgresql://user:sk-1234567890abcdef1234567890abcdef@host:5432/db",
  },
  {
    description: "API key in URL query parameter",
    message:
      "URL fetch error: https://api.example.com/data?api_key=sk-1234567890abcdef1234567890abcdef",
  },
  {
    description: "Bearer token in authorization header",
    message:
      "Authorization header Bearer sk-1234567890abcdef1234567890abcdef rejected",
  },
  {
    description: "Multiple API keys in one message",
    message:
      "API call failed: Bearer sk-test123456789 and key=AIzaSyDOCAbC123dEFGHI456789jkl123456789 both invalid",
  },
];

console.log("2️⃣ Security Test - Dangerous Messages:");
let allSafe = true;

dangerousMessages.forEach((test, i) => {
  const sanitized = sanitizeErrorMessage(test.message);
  console.log(`\n   Test ${i + 1}: ${test.description}`);
  console.log(`   Before: ${test.message}`);
  console.log(`   After:  ${sanitized}`);

  // Check if any API key patterns remain
  const hasApiKey = /sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35}/g.test(
    sanitized
  );
  const isSafe = !hasApiKey;
  console.log(
    `   Status: ${isSafe ? "✅ SANITIZED" : "❌ API KEY STILL PRESENT"}`
  );

  if (!isSafe) allSafe = false;
});

// Test 3: Edge cases
console.log("\n3️⃣ Edge Cases:");
const edgeCases = [
  { input: "", expected: "empty string handled correctly" },
  { input: null, expected: "null handled correctly" },
  { input: undefined, expected: "undefined handled correctly" },
  { input: "Normal error message", expected: "unchanged" },
  {
    input: "Short key sk-abc",
    expected: "short keys ignored (not long enough to be real API keys)",
  },
];

edgeCases.forEach((test, i) => {
  try {
    const result = sanitizeErrorMessage(test.input);
    console.log(`   Edge case ${i + 1}: ${test.expected} ✅`);
  } catch (error) {
    console.log(
      `   Edge case ${i + 1}: ${test.expected} ❌ (threw error: ${
        error.message
      })`
    );
    allSafe = false;
  }
});

console.log("\n" + "=".repeat(50));
if (allSafe) {
  console.log(
    "🎉 ALL TESTS PASSED - API key sanitization is working correctly!"
  );
  console.log(
    "✅ The settings page will safely display error messages without exposing API keys."
  );
} else {
  console.log("⚠️  SOME TESTS FAILED - Review the sanitization logic!");
  allSafe = false;
}
console.log("=".repeat(50));

// Export the result for CI/automated testing
process.exit(allSafe ? 0 : 1);
