#!/usr/bin/env node

const fetch = require("node-fetch");

async function testTRPCEndpoint() {
  const baseUrl = "http://localhost:3000";

  console.log("Testing TRPC endpoint...");

  try {
    // Test the chat.getCount procedure
    const response = await fetch(`${baseUrl}/api/trpc/chat.getCount`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (response.ok) {
      const data = await response.text();
      console.log("Response body:", data);
      console.log("✅ TRPC endpoint is working!");
    } else {
      console.log("❌ TRPC endpoint returned an error");
      console.log("Response body:", await response.text());
    }
  } catch (error) {
    console.error("❌ Error testing TRPC endpoint:", error.message);
    console.log("Make sure the dev server is running with: npm run dev");
  }
}

testTRPCEndpoint();
