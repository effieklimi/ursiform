#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// ANSI color codes for pretty output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

class TestRunner {
  constructor() {
    this.startTime = Date.now();
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      suites: [],
    };
  }

  log(message, color = "") {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  logHeader(message) {
    const separator = "=".repeat(60);
    console.log(`\n${colors.cyan}${separator}`);
    console.log(`${colors.bright}${colors.cyan}  ${message}`);
    console.log(`${separator}${colors.reset}\n`);
  }

  logSection(message) {
    console.log(`\n${colors.yellow}▶ ${message}${colors.reset}`);
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, colors.green);
  }

  logError(message) {
    this.log(`❌ ${message}`, colors.red);
  }

  logInfo(message) {
    this.log(`ℹ️  ${message}`, colors.blue);
  }

  logWarning(message) {
    this.log(`⚠️  ${message}`, colors.yellow);
  }

  async checkTestEnvironment() {
    this.logSection("Checking Test Environment");

    // Check if Jest is installed
    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      if (packageJson.devDependencies?.jest) {
        this.logSuccess(`Jest ${packageJson.devDependencies.jest} found`);
      } else {
        this.logError("Jest not found in devDependencies");
        return false;
      }
    } catch (error) {
      this.logError(`Failed to read package.json: ${error.message}`);
      return false;
    }

    // Check if test files exist
    const testDirs = ["tests/backend"];
    let testFileCount = 0;

    for (const dir of testDirs) {
      if (fs.existsSync(dir)) {
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.js"));
        testFileCount += files.length;
        this.logInfo(`Found ${files.length} test files in ${dir}/`);
        files.forEach((file) => {
          this.log(`  📄 ${file}`, colors.white);
        });
      } else {
        this.logWarning(`Test directory ${dir} not found`);
      }
    }

    if (testFileCount === 0) {
      this.logError("No test files found");
      return false;
    }

    this.logSuccess(`Total: ${testFileCount} test files ready to run`);
    return true;
  }

  parseJestOutput(data) {
    const lines = data.toString().split("\n");

    for (const line of lines) {
      if (line.includes("PASS")) {
        const match = line.match(/PASS\s+(.+\.test\.(ts|js))/);
        if (match) {
          this.logSuccess(`${match[1]}`);
        }
      } else if (line.includes("FAIL")) {
        const match = line.match(/FAIL\s+(.+\.test\.(ts|js))/);
        if (match) {
          this.logError(`${match[1]}`);
        }
      } else if (line.includes("Test Suites:")) {
        this.log(line.trim(), colors.cyan);
      } else if (line.includes("Tests:")) {
        this.log(line.trim(), colors.cyan);
      } else if (line.includes("Snapshots:")) {
        this.log(line.trim(), colors.cyan);
      } else if (line.includes("Time:")) {
        this.log(line.trim(), colors.cyan);
      } else if (line.includes("Ran all test suites")) {
        this.logSuccess("All test suites completed");
      }
    }
  }

  async runTests(options = {}) {
    const {
      coverage = false,
      watch = false,
      verbose = true,
      pattern = null,
    } = options;

    this.logSection("Starting Test Execution");

    const jestArgs = [];

    if (coverage) {
      jestArgs.push("--coverage");
      this.logInfo("Coverage reporting enabled");
    }

    if (watch) {
      jestArgs.push("--watch");
      this.logInfo("Watch mode enabled");
    }

    if (verbose) {
      jestArgs.push("--verbose");
    }

    if (pattern) {
      jestArgs.push("--testNamePattern", pattern);
      this.logInfo(`Running tests matching pattern: ${pattern}`);
    }

    // Add configuration
    jestArgs.push("--passWithNoTests");
    jestArgs.push("--detectOpenHandles");

    return new Promise((resolve, reject) => {
      const jest = spawn("npx", ["jest", ...jestArgs], {
        stdio: "pipe",
        cwd: process.cwd(),
      });

      let allOutput = "";
      let hasErrors = false;

      jest.stdout.on("data", (data) => {
        allOutput += data.toString();
        this.parseJestOutput(data);
      });

      jest.stderr.on("data", (data) => {
        const output = data.toString();
        allOutput += output;

        // Filter out common Jest warnings that aren't actual errors
        if (
          !output.includes("jest-haste-map") &&
          !output.includes("jsdom-environment") &&
          !output.includes("deprecated")
        ) {
          this.logError(output.trim());
          hasErrors = true;
        }
      });

      jest.on("close", (code) => {
        const endTime = Date.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);

        console.log("\n" + "=".repeat(60));

        if (code === 0) {
          this.logSuccess(`All tests completed successfully in ${duration}s`);
        } else {
          this.logError(
            `Tests failed with exit code ${code} after ${duration}s`
          );
        }

        // Parse final results
        this.parseFinalResults(allOutput);

        resolve({ code, output: allOutput, hasErrors });
      });

      jest.on("error", (error) => {
        this.logError(`Failed to start Jest: ${error.message}`);
        reject(error);
      });
    });
  }

  parseFinalResults(output) {
    this.logSection("Test Results Summary");

    // Extract test results
    const suiteMatch = output.match(
      /Test Suites:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?/
    );
    const testMatch = output.match(
      /Tests:\s*(\d+)\s*passed(?:,\s*(\d+)\s*failed)?/
    );
    const timeMatch = output.match(/Time:\s*([\d.]+)\s*s/);

    if (suiteMatch) {
      const suitePassed = parseInt(suiteMatch[1] || "0");
      const suiteFailed = parseInt(suiteMatch[2] || "0");
      this.log(
        `📦 Test Suites: ${suitePassed} passed, ${suiteFailed} failed`,
        colors.cyan
      );
    }

    if (testMatch) {
      const testPassed = parseInt(testMatch[1] || "0");
      const testFailed = parseInt(testMatch[2] || "0");
      this.log(
        `🧪 Individual Tests: ${testPassed} passed, ${testFailed} failed`,
        colors.cyan
      );
    }

    if (timeMatch) {
      this.log(`⏱️  Execution Time: ${timeMatch[1]}s`, colors.cyan);
    }

    // Check for coverage
    if (output.includes("Coverage")) {
      this.logInfo("Coverage report generated - check coverage/ directory");
    }
  }

  async runCoverageReport() {
    this.logSection("Generating Coverage Report");

    try {
      const result = await this.runTests({ coverage: true });

      if (result.code === 0) {
        this.logSuccess("Coverage report generated successfully");
        this.logInfo(
          "Open coverage/lcov-report/index.html to view detailed coverage"
        );
      }

      return result;
    } catch (error) {
      this.logError(`Coverage generation failed: ${error.message}`);
      return { code: 1, error };
    }
  }

  async runSpecificSuite(suiteName) {
    this.logSection(`Running Test Suite: ${suiteName}`);

    try {
      const result = await this.runTests({ pattern: suiteName });
      return result;
    } catch (error) {
      this.logError(`Failed to run suite ${suiteName}: ${error.message}`);
      return { code: 1, error };
    }
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    coverage: args.includes("--coverage") || args.includes("-c"),
    watch: args.includes("--watch") || args.includes("-w"),
    verbose: !args.includes("--quiet"),
    suite: args.find((arg) => arg.startsWith("--suite="))?.split("=")[1],
    help: args.includes("--help") || args.includes("-h"),
  };

  if (options.help) {
    console.log(`
${colors.cyan}🧪 Ursiform Test Runner${colors.reset}

Usage: node scripts/test-runner.js [options]

Options:
  --coverage, -c     Generate coverage report
  --watch, -w       Run tests in watch mode
  --quiet           Reduce output verbosity
  --suite=NAME      Run specific test suite
  --help, -h        Show this help message

Examples:
  node scripts/test-runner.js                    # Run all tests
  node scripts/test-runner.js --coverage         # Run tests with coverage
  node scripts/test-runner.js --suite=config     # Run only config tests
  node scripts/test-runner.js --watch            # Run in watch mode
`);
    process.exit(0);
  }

  runner.logHeader("🧪 URSIFORM TEST RUNNER");

  try {
    // Check environment
    const envOk = await runner.checkTestEnvironment();
    if (!envOk) {
      process.exit(1);
    }

    // Run tests based on options
    let result;

    if (options.suite) {
      result = await runner.runSpecificSuite(options.suite);
    } else if (options.coverage) {
      result = await runner.runCoverageReport();
    } else {
      result = await runner.runTests(options);
    }

    // Exit with appropriate code
    process.exit(result.code);
  } catch (error) {
    runner.logError(`Test runner failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error(
    `${colors.red}❌ Uncaught Exception: ${error.message}${colors.reset}`
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    `${colors.red}❌ Unhandled Rejection at:`,
    promise,
    "reason:",
    reason,
    colors.reset
  );
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = TestRunner;
