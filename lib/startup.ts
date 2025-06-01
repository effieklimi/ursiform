import { loadConfig, validateServices, getAvailableProviders } from "./config";

/**
 * Application startup validation
 * This should be called at app boot to ensure everything is properly configured
 */
export async function validateStartup(): Promise<void> {
  console.log("🚀 Starting application validation...");

  try {
    // Step 1: Load and validate configuration
    const config = loadConfig();

    // Step 2: Check available providers
    const providers = getAvailableProviders(config);
    if (providers.length === 0) {
      throw new Error(
        "No embedding providers configured. Set either OPENAI_API_KEY or GEMINI_API_KEY environment variable."
      );
    }

    // Step 3: Validate service connectivity (non-blocking warnings)
    console.log("🔍 Validating service connectivity...");
    const serviceStatus = await validateServices(config);

    // Report service status
    const availableServices = Object.entries(serviceStatus)
      .filter(([_, available]) => available)
      .map(([service]) => service);

    if (availableServices.length === 0) {
      console.warn(
        "⚠️  Warning: No external services are reachable. App may have limited functionality."
      );
    } else {
      console.log(`✅ Available services: ${availableServices.join(", ")}`);
    }

    // Step 4: Environment-specific validations
    if (config.app.environment === "production") {
      validateProductionConfig(config);
    }

    console.log("🎉 Application validation completed successfully!");
  } catch (error) {
    console.error(
      "💥 Application validation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // In production, we want to fail fast
    if (process.env.NODE_ENV === "production") {
      console.error(
        "🚨 Exiting due to configuration errors in production mode"
      );
      process.exit(1);
    }

    // In development, we can continue with warnings
    console.warn(
      "⚠️  Continuing in development mode despite configuration issues"
    );
    throw error;
  }
}

/**
 * Additional validations for production environment
 */
function validateProductionConfig(config: any): void {
  const productionChecks = [
    {
      condition: config.qdrant.apiKey,
      message: "QDRANT_API_KEY is required in production",
    },
    {
      condition: config.qdrant.url.startsWith("https://"),
      message: "QDRANT_URL must use HTTPS in production",
    },
    {
      condition: config.app.logLevel !== "debug",
      message: 'LOG_LEVEL should not be "debug" in production',
    },
  ];

  const failures = productionChecks
    .filter((check) => !check.condition)
    .map((check) => check.message);

  if (failures.length > 0) {
    console.error("🚨 Production validation failures:");
    failures.forEach((failure) => console.error(`  • ${failure}`));
    throw new Error("Production configuration validation failed");
  }

  console.log("✅ Production configuration validation passed");
}

/**
 * Health check endpoint data
 */
export async function getHealthStatus() {
  try {
    const config = loadConfig();
    const serviceStatus = await validateServices(config);

    const isHealthy = Object.values(serviceStatus).some((status) => status);

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      environment: config.app.environment,
      services: serviceStatus,
      providers: getAvailableProviders(config),
      version: process.env.npm_package_version || "unknown",
      config: {
        qdrant: {
          url: config.qdrant.url,
          hasApiKey: !!config.qdrant.apiKey,
          defaultCollection: config.qdrant.defaultCollection,
        },
      },
    };
  } catch (error) {
    return {
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      version: process.env.npm_package_version || "unknown",
    };
  }
}
