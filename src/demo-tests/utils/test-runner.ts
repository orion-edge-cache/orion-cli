/**
 * Test execution helpers
 */

import type { TestResult, TestSuite, Endpoints, TestRunSummary, TestSuiteSummary } from "./types.js";
import { printSuiteResult } from "./output.js";

/**
 * Generate a unique ID for cache-busting queries
 */
export function uniqueId(): number {
  return Math.floor(Math.random() * 1_000_000);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single test and capture the result
 */
export async function executeTest(
  name: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  const start = Date.now();

  try {
    await testFn();
    return {
      name,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Run a single test suite and return summary
 */
async function runSuite(suite: TestSuite, endpoints: Endpoints): Promise<TestSuiteSummary> {
  const results = await suite.run(endpoints);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  printSuiteResult(suite.name, results);

  return { name: suite.name, passed, failed, results };
}

/**
 * Run all test suites and return overall summary
 */
export async function runAllSuites(
  suites: TestSuite[],
  endpoints: Endpoints
): Promise<TestRunSummary> {
  const summaries: TestSuiteSummary[] = [];

  for (const suite of suites) {
    const summary = await runSuite(suite, endpoints);
    summaries.push(summary);
  }

  const totalPassed = summaries.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = summaries.reduce((sum, s) => sum + s.failed, 0);

  return { totalPassed, totalFailed, suites: summaries };
}
