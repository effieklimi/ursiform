// jest.setup.js

// Set test environment variables
process.env.NODE_ENV = "test";

// Mock environment variables for tests
process.env.QDRANT_URL = "http://localhost:6333";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.GEMINI_API_KEY = "test-gemini-key";

// Increase timeout for longer running tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Helper to create mock Qdrant responses
  createMockQdrantResponse: (data) => ({
    collections: data.collections || [],
    count: data.count || 0,
    points: data.points || [],
    next_page_offset: data.next_page_offset || null,
  }),

  // Helper to create mock embedding responses
  createMockEmbedding: (dimension = 768) => {
    return Array(dimension)
      .fill(0)
      .map(() => Math.random() - 0.5);
  },
};

// Console override to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Suppress console.log in tests unless VERBOSE_TESTS is set
  log: process.env.VERBOSE_TESTS ? originalConsole.log : jest.fn(),
  // Keep important logs
  error: originalConsole.error,
  warn: originalConsole.warn,
  info: process.env.VERBOSE_TESTS ? originalConsole.info : jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();

  // Clear config cache
  delete global.__ursiform_config_cache__;

  // Clear any module cache for config
  jest.resetModules();

  // Clear timers
  jest.clearAllTimers();
});
