/**
 * ORION Cache Test Suite
 *
 * Comprehensive testing for GraphQL edge caching functionality.
 */

import { spinner, log } from "@clack/prompts";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../shared/index.js";
import {
  gql,
  runTest,
  runTestSuites,
  sleep,
  uniqueId,
  printDivider,
  printEndpoints,
  printCacheTestResult,
  TEST_CONFIG,
  type TestContext,
  type TestResult,
  type TestSuiteRunner,
} from "./utils/index.js";

async function runConnectivityTests(ctx: TestContext): Promise<TestResult[]> {
  return Promise.all([
    runTest("Basic Reachability", async () => {
      const res = await gql(ctx.endpoint, "{ __typename }");
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      if (res.body?.data?.__typename !== "Query") throw new Error("Unexpected typename");
    }),

    runTest("__typename Injection", async () => {
      const res = await gql(ctx.endpoint, "{ users(limit: 1) { id } }");
      const hasTypename = JSON.stringify(res.body).includes("__typename");
      if (!hasTypename) throw new Error("__typename not found");
    }),

    runTest("Compute Endpoint", async () => {
      const res = await gql(ctx.computeEndpoint, "{ __typename }", undefined, true);
      if (res.status !== 200) throw new Error(`Compute failed: ${res.status}`);
    }),
  ]);
}

async function runCacheMechanicsTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest("Basic Caching (MISS → HIT)", async () => {
      const uid = uniqueId();
      const query = `{ users(limit: 1, offset: ${uid}) { id } }`;

      const res1 = await gql(ctx.endpoint, query);
      if (!res1.isMiss) throw new Error("First should be MISS");

      const res2 = await gql(ctx.endpoint, query);
      if (!res2.isHit) throw new Error("Second should be HIT");
    })
  );

  results.push(
    await runTest("Variable Sensitivity", async () => {
      const varQuery = "query GetUser($id: ID!) { user(id: $id) { id name } }";
      const vRes1 = await gql(ctx.endpoint, varQuery, { id: "1" });
      const vRes2 = await gql(ctx.endpoint, varQuery, { id: "2" });

      if (vRes1.body?.data?.user?.id !== "1") throw new Error("Var 1 failed");
      if (vRes2.body?.data?.user?.id !== "2") throw new Error("Var 2 failed");
    })
  );

  results.push(
    await runTest("Cache Headers", async () => {
      const res = await gql(ctx.endpoint, "{ stats { userCount } }");
      const hasCache = res.cacheControl || res.isHit || res.isMiss;
      if (!hasCache) throw new Error("Missing cache headers");
    })
  );

  results.push(
    await runTest("Concurrent Requests", async () => {
      const query = "{ stats { userCount } }";
      const promises = Array(5).fill(null).map(() => gql(ctx.endpoint, query));
      const responses = await Promise.all(promises);
      const allSuccess = responses.every((r) => r.status === 200);
      if (!allSuccess) throw new Error("Concurrent failed");
    })
  );

  return results;
}

async function runSurrogateKeyTests(ctx: TestContext): Promise<TestResult[]> {
  return Promise.all([
    runTest("User Entity Extraction", async () => {
      const res = await gql(ctx.computeEndpoint, "{ users(limit: 3) { id } }", undefined, true);
      const keys = res.surrogateKeys || "";
      const userKeys = keys.split(" ").filter((k) => k.startsWith("User:"));
      if (userKeys.length < 2) throw new Error(`Need 2+ users, got ${userKeys.length}`);
    }),

    runTest("Post Entity Extraction", async () => {
      const res = await gql(ctx.computeEndpoint, "{ posts(limit: 3) { id } }", undefined, true);
      const keys = res.surrogateKeys || "";
      const postKeys = keys.split(" ").filter((k) => k.startsWith("Post:"));
      if (postKeys.length < 2) throw new Error("Need 2+ posts");
    }),

    runTest("Nested Query Entities", async () => {
      const res = await gql(
        ctx.computeEndpoint,
        "{ posts(limit: 2) { id author { id } } }",
        undefined,
        true
      );
      const keys = res.surrogateKeys || "";
      const hasPost = keys.includes("Post:");
      const hasUser = keys.includes("User:");
      if (!hasPost || !hasUser) throw new Error("Missing nested entities");
    }),
  ]);
}

async function runInvalidationTests(ctx: TestContext): Promise<TestResult[]> {
  return Promise.all([
    runTest("Update Mutation Purge", async () => {
      const uid = uniqueId();
      const mutQuery = `mutation { updateUser(id: "1", input: { name: "Test ${uid}" }) { id name } }`;
      const mutRes = await gql(ctx.endpoint, mutQuery);
      if (!mutRes.purgeKeys?.includes("User:1")) throw new Error("Missing purge key");
    }),

    runTest("Mutation Cache Bypass", async () => {
      const mutRes = await gql(
        ctx.endpoint,
        'mutation { updateUser(id: "2", input: { name: "Updated" }) { id } }'
      );
      const cc = mutRes.cacheControl.toLowerCase();
      if (!cc.includes("no-store") && !cc.includes("no-cache")) {
        throw new Error("Mutation should not cache");
      }
    }),
  ]);
}

async function runEdgeCaseTests(ctx: TestContext): Promise<TestResult[]> {
  return Promise.all([
    runTest("Invalid Query Handling", async () => {
      const res = await gql(ctx.endpoint, "{ invalidField }");
      if (!res.body?.errors) throw new Error("Should return errors");
    }),

    runTest("Non-existent ID", async () => {
      const res = await gql(ctx.endpoint, '{ user(id: "99999") { id } }');
      if (res.status >= 500) throw new Error("Server error");
    }),
  ]);
}

async function runResiliencyTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  results.push(
    await runTest("Cache Persistence", async () => {
      const uid = uniqueId();
      const query = `{ users(limit: 1, offset: ${uid}) { id } }`;

      const first = await gql(ctx.endpoint, query);
      if (!first.isMiss) throw new Error("First should be MISS");

      await sleep(TEST_CONFIG.cachePersistenceDelay);

      const second = await gql(ctx.endpoint, query);
      if (!second.isHit) throw new Error("Second should be HIT");
    })
  );

  return results;
}

export async function runCacheTests(): Promise<void> {
  log.info("ORION Cache Verification Suite");
  printDivider();

  let endpoint: string;
  let computeEndpoint: string;

  try {
    let s: ReturnType<typeof spinner> | undefined;
    const output = unwrapTerraformOutput(
      await getTerraformOutputs(() => {
        s = spinner();
        s.start("Initializing Terraform...");
      })
    );
    if (s) {
      s.stop("Terraform initialized");
    }
    endpoint = `https://${output.cdn_service.domain_name}/graphql`;
    computeEndpoint = `https://${output.compute_service.domain_name}/graphql`;
  } catch {
    log.error("Failed to get endpoints. Is infrastructure deployed?");
    return;
  }

  printEndpoints(endpoint, computeEndpoint);

  const ctx: TestContext = { endpoint, computeEndpoint };

  const suiteRunners: TestSuiteRunner[] = [
    { name: "Connectivity", run: runConnectivityTests },
    { name: "Cache Mechanics", run: runCacheMechanicsTests },
    { name: "Surrogate Keys", run: runSurrogateKeyTests },
    { name: "Invalidation", run: runInvalidationTests },
    { name: "Edge Cases", run: runEdgeCaseTests },
    { name: "Resiliency", run: runResiliencyTests },
  ];

  const { totalPassed, totalFailed } = await runTestSuites(suiteRunners, ctx);

  console.log();
  printCacheTestResult(totalPassed, totalFailed);
}
