const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.js"],
  collectCoverageFrom: [
    "lib/**/*.{js,ts}",
    "app/**/*.{js,ts}",
    "frontend/**/*.{js,ts}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage",
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000,
  // Transform configuration for TypeScript
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
