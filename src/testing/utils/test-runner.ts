/**
 * Test runner utilities for cache tests
 */

import { spinner } from "@clack/prompts";
import type { TestResult, TestContext, TestSuiteResult, TestSuiteRunner } from "./types.js";

/**
 * Run a single test with timing and error handling
 */
export async function runTest(
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
  } catch (e) {
    return {
      name,
      passed: false,
      error: e instanceof Error ? e.message : String(e),
      duration: Date.now() - start,
    };
  }
}

/**
 * Run multiple test suites and collect results
 */
export async function runTestSuites(
  suiteRunners: TestSuiteRunner[],
  ctx: TestContext
): Promise<{ suiteResults: TestSuiteResult[]; totalPassed: number; totalFailed: number }> {
  const suiteResults: TestSuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suiteRunners) {
    const s = spinner();
    s.start(`Running ${suite.name} Tests...`);

    try {
      const results = await suite.run(ctx);
      suiteResults.push({ name: suite.name, results });

      const passed = results.filter((r) => r.passed).length;
      const failed = results.length - passed;
      totalPassed += passed;
      totalFailed += failed;

      s.stop(`${suite.name}: ${passed}/${results.length} passed`);

      for (const r of results) {
        if (r.passed) {
          console.log(`    ✓ ${r.name} (${r.duration}ms)`);
        } else {
          console.log(`    ✗ ${r.name}: ${r.error}`);
        }
      }
    } catch (e) {
      s.stop(`${suite.name}: Error`);
      console.log(`    Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { suiteResults, totalPassed, totalFailed };
}

/**
 * Common test configuration
 */
export const TEST_CONFIG = {
  maxRetries: 10,
  retryDelay: 1000,
  propagationDelay: 3000,
  cachePersistenceDelay: 4000,
};

/**
 * Sleep utility
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate unique ID for test isolation
 */
export const uniqueId = () => Date.now().toString().slice(-6);
