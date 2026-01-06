/**
 * Shared types for testing utilities
 */

export interface TestContext {
  endpoint: string;
  computeEndpoint: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: string[];
}

export interface TestSuiteResult {
  name: string;
  results: TestResult[];
}

export interface GraphQLResponse {
  status: number;
  headers: Headers;
  body: any;
  rawBody: string;
  isHit: boolean;
  isMiss: boolean;
  surrogateKeys: string | null;
  purgeKeys: string | null;
  cacheControl: string;
}

export interface RequestResult {
  type: string;
  status: number;
  duration: number;
  cacheStatus: CacheStatus;
  hasSurrogateKeys: boolean;
  hasPurgeKeys: boolean;
  error?: string;
}

export type CacheStatus = "HIT" | "MISS" | "BYPASS" | "UNKNOWN";

export interface LoadTestStats {
  total: number;
  queries: number;
  mutations: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface TestSuiteRunner {
  name: string;
  run: (ctx: TestContext) => Promise<TestResult[]>;
}
