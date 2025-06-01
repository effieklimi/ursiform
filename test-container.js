// Simple test script to verify our new backend architecture
const { container } = require("./backend/container");

async function testContainer() {
  try {
    console.log("Testing container setup...");

    // Test getting the controller
    const controller = container.get("vectorController");
    console.log("✓ VectorController retrieved successfully");

    // Test the test connection method
    const connectionResult = await controller.testConnection();
    console.log("✓ Connection test result:", connectionResult);

    console.log("✓ All tests passed!");
  } catch (error) {
    console.error("✗ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

testContainer();
