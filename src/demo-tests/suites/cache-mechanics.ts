/**
 * Cache Mechanics Test Suite
 * 
 * Verifies core caching behavior: MISS→HIT transitions, variable sensitivity,
 * cache headers, and concurrent request handling.
 */

import {
  sendGraphQL,
  executeTest,
  uniqueId,
  sleep,
  type Endpoints,
  type TestResult,
} from "../utils/index.js";

const CACHE_SETTLE_DELAY = 100; // ms to wait between cache requests

/**
 * Test that first request is MISS, second is HIT
 */
async function testMissThenHit(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Cache MISS → HIT", async () => {
    const uid = uniqueId();
    const query = `query { users(limit: 1, offset: ${uid}) { id } }`;

    const first = await sendGraphQL(endpoints.vclService, query);
    if (first.cacheStatus !== "MISS") {
      throw new Error(`First request should be MISS, got ${first.cacheStatus}`);
    }

    await sleep(CACHE_SETTLE_DELAY);

    const second = await sendGraphQL(endpoints.vclService, query);
    if (second.cacheStatus !== "HIT") {
      throw new Error(`Second request should be HIT, got ${second.cacheStatus}`);
    }
  });
}

/**
 * Test that different variables produce different cache entries
 */
async function testVariableSensitivity(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Variable Sensitivity", async () => {
    const query = "query GetUser($id: ID!) { user(id: $id) { id name } }";

    const response1 = await sendGraphQL(endpoints.vclService, query, { id: "1" });
    const response2 = await sendGraphQL(endpoints.vclService, query, { id: "2" });

    const data1 = (response1.body as Record<string, unknown>)?.data as Record<string, unknown>;
    const data2 = (response2.body as Record<string, unknown>)?.data as Record<string, unknown>;
    const user1 = data1?.user as Record<string, unknown>;
    const user2 = data2?.user as Record<string, unknown>;

    if (user1?.id !== "1") {
      throw new Error(`Expected user id "1", got "${user1?.id}"`);
    }
    if (user2?.id !== "2") {
      throw new Error(`Expected user id "2", got "${user2?.id}"`);
    }
  });
}

/**
 * Test that responses include cache control headers
 */
async function testCacheHeaders(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Cache Headers Present", async () => {
    const response = await sendGraphQL(endpoints.vclService, "query { users(limit: 1) { id } }");

    const hasHeaders = response.cacheControl || response.cacheStatus !== "UNKNOWN";
    if (!hasHeaders) {
      throw new Error("Response missing cache headers");
    }
  });
}

/**
 * Test that concurrent requests are handled correctly
 */
async function testConcurrentRequests(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Concurrent Requests", async () => {
    const query = "query { users(limit: 1) { id } }";
    const requests = Array(5).fill(null).map(() => sendGraphQL(endpoints.vclService, query));
    const responses = await Promise.all(requests);

    const allSucceeded = responses.every((r) => r.status === 200);
    if (!allSucceeded) {
      const failed = responses.filter((r) => r.status !== 200).length;
      throw new Error(`${failed} of 5 concurrent requests failed`);
    }
  });
}

/**
 * Run all cache mechanics tests
 */
export async function runCacheMechanicsSuite(endpoints: Endpoints): Promise<TestResult[]> {
  return [
    await testMissThenHit(endpoints),
    await testVariableSensitivity(endpoints),
    await testCacheHeaders(endpoints),
    await testConcurrentRequests(endpoints),
  ];
}
