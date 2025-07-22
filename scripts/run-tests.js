#!/usr/bin/env node

/**
 * Comprehensive test runner script
 * This script runs all tests (unit, integration, and e2e) with proper configuration
 * It also includes performance testing and coverage reporting
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Configuration
const config = {
  unit: {
    command: "npx vitest run",
    description: "Running unit and integration tests",
  },
  e2e: {
    command: "npx playwright test",
    description: "Running end-to-end tests",
  },
  coverage: {
    command: "npx vitest run --coverage",
    description: "Running tests with coverage report",
  },
  performance: {
    command:
      "npx autocannon -c 100 -d 5 -p 10 http://localhost:3000/api/menu/current",
    description: "Running API performance tests",
  },
  lint: {
    command: "npx eslint . --ext .js,.jsx,.ts,.tsx",
    description: "Running code linting",
  },
  typecheck: {
    command: "npx tsc --noEmit",
    description: "Running TypeScript type checking",
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const runCoverage = args.includes("--coverage");
const runE2E = args.includes("--e2e");
const runUnit = args.includes("--unit") || !runE2E;
const runPerformance = args.includes("--performance");
const runLint = args.includes("--lint");
const runTypecheck = args.includes("--typecheck");
const runAll = args.includes("--all");
const generateReport = args.includes("--report");

// Helper to run a command and handle errors
function runCommand(command, description) {
  console.log(`\n📋 ${description}...\n`);

  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} failed with error code ${error.status}`);
    return false;
  }
}

// Helper to generate a test report
function generateTestReport(results) {
  const reportDir = path.join(process.cwd(), "test-reports");

  // Create report directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Generate report file
  const reportPath = path.join(
    reportDir,
    `test-report-${new Date().toISOString().replace(/:/g, "-")}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log(`\n📊 Test report generated at ${reportPath}`);

  // Generate HTML report if coverage data exists
  if (fs.existsSync(path.join(process.cwd(), "coverage"))) {
    try {
      execSync("npx nyc report --reporter=html", { stdio: "inherit" });
      console.log(`\n📊 HTML coverage report generated in coverage/index.html`);
    } catch (error) {
      console.error(
        `\n❌ Failed to generate HTML coverage report: ${error.message}`
      );
    }
  }
}

// Main execution
async function main() {
  console.log("🧪 Starting test suite execution\n");

  const startTime = Date.now();
  let success = true;
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      success: true,
      duration: 0,
    },
  };

  // Run TypeScript type checking
  if (runTypecheck || runAll) {
    const typecheckStart = Date.now();
    const typecheckSuccess = runCommand(
      config.typecheck.command,
      config.typecheck.description
    );
    success = typecheckSuccess && success;
    results.tests.typecheck = {
      success: typecheckSuccess,
      duration: Date.now() - typecheckStart,
    };
  }

  // Run linting
  if (runLint || runAll) {
    const lintStart = Date.now();
    const lintSuccess = runCommand(
      config.lint.command,
      config.lint.description
    );
    success = lintSuccess && success;
    results.tests.lint = {
      success: lintSuccess,
      duration: Date.now() - lintStart,
    };
  }

  // Run unit and integration tests
  if (runUnit || runAll) {
    const unitStart = Date.now();
    let unitSuccess;

    if (runCoverage || runAll) {
      unitSuccess = runCommand(
        config.coverage.command,
        config.coverage.description
      );
    } else {
      unitSuccess = runCommand(config.unit.command, config.unit.description);
    }

    success = unitSuccess && success;
    results.tests.unit = {
      success: unitSuccess,
      duration: Date.now() - unitStart,
    };
  }

  // Run E2E tests
  if (runE2E || runAll) {
    const e2eStart = Date.now();
    const e2eSuccess = runCommand(config.e2e.command, config.e2e.description);
    success = e2eSuccess && success;
    results.tests.e2e = {
      success: e2eSuccess,
      duration: Date.now() - e2eStart,
    };
  }

  // Run performance tests
  if (runPerformance || runAll) {
    // Start the server in test mode if it's not already running
    let serverProcess;
    try {
      console.log("\n🚀 Starting server for performance testing...");
      serverProcess = (await import("child_process")).spawn("npm", ["run", "dev"], {
        stdio: "ignore",
        detached: true,
      });

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const perfStart = Date.now();
      const perfSuccess = runCommand(
        config.performance.command,
        config.performance.description
      );
      success = perfSuccess && success;
      results.tests.performance = {
        success: perfSuccess,
        duration: Date.now() - perfStart,
      };
    } catch (error) {
      console.error(`\n❌ Performance testing failed: ${error.message}`);
      results.tests.performance = {
        success: false,
        error: error.message,
      };
      success = false;
    } finally {
      // Kill the server if we started it
      if (serverProcess) {
        process.kill(-serverProcess.pid);
      }
    }
  }

  // Calculate total duration
  const totalDuration = Date.now() - startTime;
  results.summary.duration = totalDuration;
  results.summary.success = success;

  // Generate report if requested
  if (generateReport || runAll) {
    generateTestReport(results);
  }

  // Final status
  if (success) {
    console.log(
      `\n✅ All tests completed successfully in ${(
        totalDuration / 1000
      ).toFixed(2)}s!`
    );
    process.exit(0);
  } else {
    console.error(
      `\n❌ Some tests failed. Please check the output above for details. Total duration: ${(
        totalDuration / 1000
      ).toFixed(2)}s`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error running tests:", error);
  process.exit(1);
});
