/**
 * Output formatting utilities for cache test results
 */

import { log } from "@clack/prompts";
import type { TestResult } from "./types.js";

const PASS_SYMBOL = "\x1b[32m\u2713\x1b[0m"; // Green checkmark
const FAIL_SYMBOL = "\x1b[31m\u2717\x1b[0m"; // Red X

/**
 * Print a horizontal divider
 */
export function printDivider(width = 40): void {
  console.log("\u2500".repeat(width));
}

/**
 * Print the VCL endpoint being tested
 */
export function printEndpoint(endpoint: string): void {
  console.log(`\n  VCL Endpoint: ${endpoint}\n`);
}

/**
 * Format a single test result line
 */
function formatTestResult(result: TestResult): string {
  const symbol = result.passed ? PASS_SYMBOL : FAIL_SYMBOL;
  const duration = `(${result.duration}ms)`;
  const error = result.error ? `: ${result.error}` : "";
  
  return `    ${symbol} ${result.name} ${duration}${error}`;
}

/**
 * Print results for a single test suite
 */
export function printSuiteResult(suiteName: string, results: TestResult[]): void {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  
  console.log(`\n\u25C7  ${suiteName}: ${passed}/${total} passed`);
  
  for (const result of results) {
    console.log(formatTestResult(result));
  }
}

/**
 * Print final test run summary
 */
export function printFinalSummary(totalPassed: number, totalFailed: number): void {
  console.log();
  printDivider();
  
  if (totalFailed === 0) {
    log.success(`All ${totalPassed} tests passed!`);
  } else {
    log.error(`${totalFailed} failed, ${totalPassed} passed`);
  }
}
