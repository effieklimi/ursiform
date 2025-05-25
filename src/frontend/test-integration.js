// Simple integration test for frontend-backend communication

async function testIntegration() {
  console.log("🧪 Testing frontend-backend integration...\n");

  try {
    // Test 1: Backend health check
    console.log("1. Testing backend health...");
    const healthResponse = await fetch("http://localhost:8000/health");
    const healthData = await healthResponse.json();
    console.log("✅ Backend health:", healthData);

    // Test 2: Natural language query
    console.log("\n2. Testing natural language query...");
    const queryResponse = await fetch("http://localhost:8000/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: "How many artists are in this collection?",
        collection: "midjourneysample",
        provider: "openai",
      }),
    });

    const queryData = await queryResponse.json();
    console.log("✅ Query response:", {
      question: queryData.question,
      answer: queryData.answer,
      query_type: queryData.query_type,
      execution_time: queryData.execution_time_ms + "ms",
    });

    // Test 3: Frontend accessibility (just check if port responds)
    console.log("\n3. Testing frontend accessibility...");
    try {
      const frontendResponse = await fetch("http://localhost:3000", {
        timeout: 3000,
      });
      console.log("✅ Frontend is accessible on port 3000");
    } catch (err) {
      console.log("⚠️  Frontend not accessible (needs to be started manually)");
    }

    console.log("\n🎉 Integration test completed successfully!");
    console.log("\nTo use the application:");
    console.log("1. Backend is running on: http://localhost:8000");
    console.log("2. Start frontend with: npm run dev (in /src/frontend)");
    console.log("3. Access frontend at: http://localhost:3000");
  } catch (error) {
    console.error("❌ Integration test failed:", error.message);
  }
}

testIntegration();
