/**
 * Type definitions for demo cache tests
 */

/**
 * Endpoints configuration - only VCL service needed
 * All requests go through VCL, which forwards to Compute on cache miss
 */
export interface Endpoints {
  vclService: string;
}

/**
 * Result of a single test execution
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

/**
 * A test suite containing multiple related tests
 */
export interface TestSuite {
  name: string;
  run: (endpoints: Endpoints) => Promise<TestResult[]>;
}

/**
 * Cache status from x-cache header
 */
export type CacheStatus = "HIT" | "MISS" | "BYPASS" | "UNKNOWN";

/**
 * Parsed response from a GraphQL request
 */
export interface GraphQLResponse {
  status: number;
  body: Record<string, unknown> | null;
  rawBody: string;
  cacheStatus: CacheStatus;
  surrogateKeys: string | null;
  purgeKeys: string | null;
  cacheControl: string;
}

/**
 * Summary of test suite execution
 */
export interface TestSuiteSummary {
  name: string;
  passed: number;
  failed: number;
  results: TestResult[];
}

/**
 * Overall test run summary
 */
export interface TestRunSummary {
  totalPassed: number;
  totalFailed: number;
  suites: TestSuiteSummary[];
}
