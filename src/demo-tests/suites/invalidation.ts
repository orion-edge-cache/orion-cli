/**
 * Invalidation Test Suite
 * 
 * Verifies that mutations bypass the cache and trigger purge keys
 * for cache invalidation.
 */

import { sendGraphQL, executeTest, uniqueId, type Endpoints, type TestResult } from "../utils/index.js";

/**
 * Test that mutations are not cached (no-store/no-cache)
 */
async function testMutationCacheBypass(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Mutation Cache Bypass", async () => {
    const uid = uniqueId();
    const mutation = `mutation { updateUser(id: "1", name: "Test ${uid}", email: "test${uid}@example.com") { id } }`;
    
    const response = await sendGraphQL(endpoints.vclService, mutation);
    const cacheControl = response.cacheControl.toLowerCase();

    const isBypassed = cacheControl.includes("no-store") || cacheControl.includes("no-cache");
    if (!isBypassed) {
      throw new Error(`Mutation should not be cached, got: ${response.cacheControl}`);
    }
  });
}

/**
 * Test that mutations return purge keys for affected entities
 */
async function testMutationPurgeKeys(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Mutation Purge Keys", async () => {
    const uid = uniqueId();
    const mutation = `mutation { updateUser(id: "1", name: "Test ${uid}", email: "test${uid}@example.com") { id name } }`;
    
    const response = await sendGraphQL(endpoints.vclService, mutation);

    if (!response.purgeKeys) {
      throw new Error("Mutation response missing X-Purge-Keys header");
    }

    if (!response.purgeKeys.includes("User:1")) {
      throw new Error(`Expected purge key "User:1", got: ${response.purgeKeys}`);
    }
  });
}

/**
 * Run all invalidation tests
 */
export async function runInvalidationSuite(endpoints: Endpoints): Promise<TestResult[]> {
  return [
    await testMutationCacheBypass(endpoints),
    await testMutationPurgeKeys(endpoints),
  ];
}
