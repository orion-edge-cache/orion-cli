/**
 * Statistics calculation utilities for load testing
 */

import type { RequestResult, LoadTestStats } from "./types.js";

/**
 * Calculate percentile value from sorted array
 */
export function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.floor(sortedArr.length * p);
  return sortedArr[Math.min(index, sortedArr.length - 1)] ?? 0;
}

/**
 * Calculate comprehensive statistics from request results
 */
export function calculateStats(results: RequestResult[]): LoadTestStats {
  const latencies = results.map((r) => r.duration).sort((a, b) => a - b);
  const queries = results.filter((r) => r.type.startsWith("query"));
  const mutations = results.filter((r) => r.type.startsWith("mutation"));

  const sum = latencies.reduce((a, b) => a + b, 0);

  return {
    total: results.length,
    queries: queries.length,
    mutations: mutations.length,
    cacheHits: results.filter((r) => r.cacheStatus === "HIT").length,
    cacheMisses: results.filter((r) => r.cacheStatus === "MISS").length,
    errors: results.filter((r) => r.error || r.status !== 200).length,
    avgLatency: latencies.length > 0 ? sum / latencies.length : 0,
    minLatency: latencies[0] || 0,
    maxLatency: latencies[latencies.length - 1] || 0,
    p50: percentile(latencies, 0.5),
    p95: percentile(latencies, 0.95),
    p99: percentile(latencies, 0.99),
  };
}

/**
 * Calculate average latency for a subset of results
 */
export function calculateAverageLatency(results: RequestResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.duration, 0);
  return sum / results.length;
}

/**
 * Filter results by cache status
 */
export function filterByCacheStatus(
  results: RequestResult[],
  status: "HIT" | "MISS" | "BYPASS" | "UNKNOWN"
): RequestResult[] {
  return results.filter((r) => r.cacheStatus === status);
}
