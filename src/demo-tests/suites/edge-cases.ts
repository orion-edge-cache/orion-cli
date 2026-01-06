/**
 * Edge Cases Test Suite
 * 
 * Verifies error handling for invalid queries and non-existent resources.
 */

import { sendGraphQL, executeTest, type Endpoints, type TestResult } from "../utils/index.js";

/**
 * Test that invalid queries return GraphQL errors (not server errors)
 */
async function testInvalidQuery(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Invalid Query Handling", async () => {
    const response = await sendGraphQL(endpoints.vclService, "query { nonExistentField }");
    const body = response.body as Record<string, unknown>;

    if (!body?.errors) {
      throw new Error("Invalid query should return errors array");
    }
  });
}

/**
 * Test that queries for non-existent IDs don't cause server errors
 */
async function testNonExistentId(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Non-existent ID", async () => {
    const response = await sendGraphQL(
      endpoints.vclService,
      'query { user(id: "99999") { id } }'
    );

    if (response.status >= 500) {
      throw new Error(`Server error for non-existent ID: ${response.status}`);
    }
  });
}

/**
 * Run all edge case tests
 */
export async function runEdgeCasesSuite(endpoints: Endpoints): Promise<TestResult[]> {
  return [
    await testInvalidQuery(endpoints),
    await testNonExistentId(endpoints),
  ];
}
