/**
 * Connectivity Test Suite
 * 
 * Verifies that the VCL service is reachable and connected to the origin.
 */

import { sendGraphQL, executeTest, type Endpoints, type TestResult } from "../utils/index.js";

/**
 * Test that the VCL endpoint responds to requests
 */
async function testVclReachability(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("VCL Reachability", async () => {
    const response = await sendGraphQL(endpoints.vclService, "query { __typename }");
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
  });
}

/**
 * Test that the origin GraphQL server is connected and responding
 */
async function testOriginConnection(endpoints: Endpoints): Promise<TestResult> {
  return executeTest("Origin Connection", async () => {
    const response = await sendGraphQL(endpoints.vclService, "query { __typename }");
    
    const typename = (response.body as Record<string, unknown>)?.data;
    const data = typename as Record<string, unknown> | undefined;
    
    if (data?.__typename !== "Query") {
      throw new Error(`Expected __typename "Query", got "${data?.__typename}"`);
    }
  });
}

/**
 * Run all connectivity tests
 */
export async function runConnectivitySuite(endpoints: Endpoints): Promise<TestResult[]> {
  return [
    await testVclReachability(endpoints),
    await testOriginConnection(endpoints),
  ];
}
