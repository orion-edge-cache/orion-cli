/**
 * Surrogate Keys Test Suite
 * 
 * Verifies that entity-based surrogate keys are extracted and returned
 * in response headers for cache invalidation.
 */

import { sendGraphQL, executeTest, type Endpoints, type TestResult } from "../utils/index.js";

/**
 * Extract keys matching a prefix from surrogate key header
 */
function extractKeysWithPrefix(surrogateKeys: string | null, prefix: string): string[] {
  if (!surrogateKeys) return [];
  return surrogateKeys.split(" ").filter((key) => key.startsWith(prefix));
}

/**
 * Test that user entities are extracted as surrogate keys
 */
async function testUserEntityKeys(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("User Entity Keys", async () => {
    const response = await sendGraphQL(endpoints.vclService, "query { users(limit: 3) { id } }");
    const userKeys = extractKeysWithPrefix(response.surrogateKeys, "User:");

    if (userKeys.length < 2) {
      throw new Error(`Expected 2+ User keys, got ${userKeys.length}`);
    }
  });
}

/**
 * Test that post entities are extracted as surrogate keys
 */
async function testPostEntityKeys(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Post Entity Keys", async () => {
    const response = await sendGraphQL(endpoints.vclService, "query { posts(limit: 3) { id } }");
    const postKeys = extractKeysWithPrefix(response.surrogateKeys, "Post:");

    if (postKeys.length < 2) {
      throw new Error(`Expected 2+ Post keys, got ${postKeys.length}`);
    }
  });
}

/**
 * Test that nested entities (posts with authors) produce multiple key types
 */
async function testNestedEntityKeys(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Nested Entity Keys", async () => {
    const query = "query { posts(limit: 2) { id author { id } } }";
    const response = await sendGraphQL(endpoints.vclService, query);

    const postKeys = extractKeysWithPrefix(response.surrogateKeys, "Post:");
    const userKeys = extractKeysWithPrefix(response.surrogateKeys, "User:");

    if (postKeys.length === 0) {
      throw new Error("Missing Post keys in nested query");
    }
    if (userKeys.length === 0) {
      throw new Error("Missing User keys in nested query");
    }
  });
}

/**
 * Run all surrogate key tests
 */
export async function runSurrogateKeysSuite(endpoints: Endpoints): Promise<TestResult[]> {
  return [
    await testUserEntityKeys(endpoints),
    await testPostEntityKeys(endpoints),
    await testNestedEntityKeys(endpoints),
  ];
}
