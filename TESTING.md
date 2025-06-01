# 🧪 Ursiform Testing Guide

## Overview

This project includes a comprehensive test suite with **106 tests** across 5 backend modules, providing **95%+ coverage** of critical functionality.

## Test Structure

```
tests/
└── backend/
    ├── config.test.ts      # Configuration & environment validation (26 tests)
    ├── startup.test.ts     # Service connectivity & health checks (17 tests)
    ├── qdrant-db.test.ts   # Database operations & connections (25 tests)
    ├── embedder.test.ts    # Embedding generation & providers (23 tests)
    └── nlp-query.test.ts   # Natural language processing (25 tests)
```

## Test Runner

### Quick Start

```bash
# Run all tests with detailed logging
npm run test:run

# Run with coverage report
npm run test:run-coverage

# Run in watch mode (auto-restart on changes)
npm run test:run-watch
```

### Individual Test Suites

```bash
# Run specific test suites
npm run test:config      # Configuration tests
npm run test:startup     # Startup validation tests
npm run test:db          # Qdrant database tests
npm run test:embedder    # Embedding provider tests
npm run test:nlp         # NLP query processing tests
```

### Advanced Usage

```bash
# Direct test runner usage
node scripts/test-runner.js [options]

# Options:
--coverage, -c     # Generate coverage report
--watch, -w       # Run tests in watch mode
--quiet           # Reduce output verbosity
--suite=NAME      # Run specific test suite
--help, -h        # Show help message

# Examples:
node scripts/test-runner.js --coverage
node scripts/test-runner.js --suite=config
node scripts/test-runner.js --watch
```

## Test Categories

### 1. Configuration Tests (`config.test.ts`)

Tests environment variable parsing, Zod schema validation, and provider detection.

**Key Areas:**

- Environment variable validation
- URL format validation
- Provider configuration (OpenAI/Gemini)
- Development vs production settings
- Edge cases and error handling

### 2. Startup Tests (`startup.test.ts`)

Tests service connectivity and application initialization.

**Key Areas:**

- Qdrant connection validation
- OpenAI/Gemini API connectivity
- Health endpoint functionality
- Production validation requirements
- Graceful degradation handling

### 3. Database Tests (`qdrant-db.test.ts`)

Tests Qdrant database operations and connection management.

**Key Areas:**

- Client creation and connection
- Local vs cloud configurations
- Collection operations
- Authentication and network errors
- Timeout and retry logic

### 4. Embedder Tests (`embedder.test.ts`)

Tests embedding generation across different providers.

**Key Areas:**

- OpenAI embedding generation
- Gemini embedding generation
- Provider validation and fallbacks
- Rate limiting and error handling
- Unicode and special character support

### 5. NLP Query Tests (`nlp-query.test.ts`)

Tests natural language query processing and intent recognition.

**Key Areas:**

- Query type detection (search/count/list/info)
- Vector search functionality
- Collection resolution
- Conversation context handling
- Error recovery and fallbacks

## Test Output

The test runner provides detailed, timestamped logs with color-coded output:

```
🧪 URSIFORM TEST RUNNER
============================================================

▶ Checking Test Environment
[14:30:15] ✅ Jest ^29.7.0 found
[14:30:15] ℹ️  Found 5 test files in tests/backend/
[14:30:15]   📄 config.test.ts
[14:30:15]   📄 startup.test.ts
[14:30:15]   📄 qdrant-db.test.ts
[14:30:15]   📄 embedder.test.ts
[14:30:15]   📄 nlp-query.test.ts
[14:30:15] ✅ Total: 5 test files ready to run

▶ Starting Test Execution
[14:30:16] ✅ tests/backend/config.test.ts
[14:30:18] ✅ tests/backend/startup.test.ts
[14:30:20] ✅ tests/backend/qdrant-db.test.ts
[14:30:22] ✅ tests/backend/embedder.test.ts
[14:30:24] ✅ tests/backend/nlp-query.test.ts
[14:30:24] ✅ All test suites completed

============================================================
[14:30:25] ✅ All tests completed successfully in 9.87s

▶ Test Results Summary
[14:30:25] 📦 Test Suites: 5 passed, 0 failed
[14:30:25] 🧪 Individual Tests: 106 passed, 0 failed
[14:30:25] ⏱️  Execution Time: 9.87s
```

## Coverage Reports

When running with `--coverage`, detailed coverage reports are generated:

```bash
npm run test:run-coverage
```

Coverage files are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI/CD
- `coverage/coverage-final.json` - JSON format

## Environment Setup

### Required Environment Variables

For tests to run properly, these environment variables are automatically mocked:

```bash
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=test-openai-key
GEMINI_API_KEY=test-gemini-key
```

### Optional Test Variables

```bash
VERBOSE_TESTS=true    # Enable verbose console output in tests
NODE_ENV=test         # Set automatically by Jest
```

## Troubleshooting

### Common Issues

1. **Tests timing out**

   ```bash
   # Increase timeout in jest.setup.js or individual tests
   jest.setTimeout(60000);
   ```

2. **Module not found errors**

   ```bash
   # Ensure all dependencies are installed
   npm install
   ```

3. **TypeScript compilation errors**
   ```bash
   # Check TypeScript configuration
   npm run type-check
   ```

### Debug Mode

Run tests with detailed output:

```bash
VERBOSE_TESTS=true npm run test:run
```

### Manual Jest Execution

If the test runner has issues, you can run Jest directly:

```bash
# Basic Jest run
npm test

# With coverage
npm run test:coverage

# Specific file
npx jest tests/backend/config.test.ts
```

## CI/CD Integration

The test runner is designed for CI/CD environments:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm run test:run-coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Best Practices

1. **Run tests before commits**

   ```bash
   npm run test:run
   ```

2. **Use watch mode during development**

   ```bash
   npm run test:run-watch
   ```

3. **Check coverage regularly**

   ```bash
   npm run test:run-coverage
   ```

4. **Test specific areas when debugging**
   ```bash
   npm run test:config    # Just config tests
   npm run test:embedder  # Just embedding tests
   ```

## Adding New Tests

1. Create test files in `tests/backend/`
2. Follow naming convention: `*.test.ts`
3. Use the existing test structure and mocking patterns
4. Update this documentation if adding new test categories

The test runner will automatically discover and run new test files.
