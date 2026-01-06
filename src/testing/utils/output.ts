/**
 * Output formatting utilities for test results
 */

import { log } from "@clack/prompts";
import type { LoadTestStats, RequestResult } from "./types.js";

/**
 * Print a horizontal divider
 */
export function printDivider(width = 40): void {
  console.log("─".repeat(width));
}

/**
 * Print load test statistics
 */
export function printLoadTestStats(stats: LoadTestStats): void {
  console.log("\n  Request Distribution");
  console.log(`    Total:     ${stats.total}`);
  console.log(`    Queries:   ${stats.queries}`);
  console.log(`    Mutations: ${stats.mutations}`);

  console.log("\n  Cache Performance");
  console.log(`    Hits:      ${stats.cacheHits}`);
  console.log(`    Misses:    ${stats.cacheMisses}`);
  console.log(`    Hit Rate:  ${((stats.cacheHits / stats.total) * 100).toFixed(1)}%`);

  console.log("\n  Latency (ms)");
  console.log(`    Average:   ${stats.avgLatency.toFixed(2)}`);
  console.log(`    Min:       ${stats.minLatency}`);
  console.log(`    Max:       ${stats.maxLatency}`);
  console.log(`    P50:       ${stats.p50}`);
  console.log(`    P95:       ${stats.p95}`);
  console.log(`    P99:       ${stats.p99}`);
}

/**
 * Print latency comparison between cache hits and misses
 */
export function printLatencyComparison(results: RequestResult[]): void {
  const hitLatencies = results
    .filter((r) => r.cacheStatus === "HIT")
    .map((r) => r.duration);
  const missLatencies = results
    .filter((r) => r.cacheStatus === "MISS")
    .map((r) => r.duration);

  if (hitLatencies.length > 0 && missLatencies.length > 0) {
    const avgHit = hitLatencies.reduce((a, b) => a + b, 0) / hitLatencies.length;
    const avgMiss = missLatencies.reduce((a, b) => a + b, 0) / missLatencies.length;

    console.log("\n  Latency Comparison");
    console.log(`    Avg HIT:   ${avgHit.toFixed(2)}ms`);
    console.log(`    Avg MISS:  ${avgMiss.toFixed(2)}ms`);
    console.log(`    Speedup:   ${(avgMiss / avgHit).toFixed(1)}x faster`);
  }
}

/**
 * Print error summary
 */
export function printErrorSummary(stats: LoadTestStats): void {
  console.log("\n  Errors");
  console.log(`    Total:     ${stats.errors}`);
  console.log(`    Rate:      ${((stats.errors / stats.total) * 100).toFixed(2)}%`);
}

/**
 * Print final load test result
 */
export function printLoadTestResult(stats: LoadTestStats): void {
  printDivider();
  if (stats.errors === 0) {
    log.success("Load test passed!");
  } else {
    log.warning(`${stats.errors} errors detected`);
  }
}

/**
 * Print final cache test result
 */
export function printCacheTestResult(totalPassed: number, totalFailed: number): void {
  printDivider();
  if (totalFailed === 0) {
    log.success(`All ${totalPassed} tests passed!`);
  } else {
    log.error(`${totalFailed} failed, ${totalPassed} passed`);
  }
}

/**
 * Print test endpoint info
 */
export function printEndpoints(endpoint: string, computeEndpoint?: string): void {
  if (computeEndpoint) {
    console.log(`\n  VCL Endpoint:     ${endpoint}`);
    console.log(`  Compute Endpoint: ${computeEndpoint}\n`);
  } else {
    console.log(`\n  Endpoint: ${endpoint}\n`);
  }
}

/**
 * Print load test configuration
 */
export function printLoadTestConfig(totalRequests: number, endpoint: string): void {
  console.log(`\n  Endpoint: ${endpoint}`);
  console.log(`  Total: ${totalRequests} (70% queries, 30% mutations)\n`);
}
