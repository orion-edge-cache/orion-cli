/**
 * ORION Cache Test Suite
 * 
 * Comprehensive testing for GraphQL edge caching functionality.
 * Ported from the original CLI with @clack/prompts integration.
 */

import { spinner, log } from "@clack/prompts";
import { getTerraformOutput } from "@orion/infra";

const CONFIG = {
  maxRetries: 10,
  retryDelay: 1000,
  propagationDelay: 3000,
  cachePersistenceDelay: 4000,
};

interface TestContext {
  endpoint: string;
  computeEndpoint: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: string[];
}

interface TestSuiteResult {
  name: string;
  results: TestResult[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const uniqueId = () => Date.now().toString().slice(-6);

async function gql(
  url: string,
  query: string,
  variables?: any,
  useHeader = false
) {
  const bodyStr = JSON.stringify({ query, variables });
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (useHeader) {
    headers["X-GraphQL-Query"] = bodyStr;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: useHeader ? null : bodyStr,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawBody: text,
    isHit: res.headers.get("x-cache")?.includes("HIT") || false,
    isMiss: res.headers.get("x-cache")?.includes("MISS") || false,
    surrogateKeys: res.headers.get("surrogate-key"),
    purgeKeys: res.headers.get("x-purge-keys"),
    cacheControl: res.headers.get("cache-control") || "",
  };
}

async function runConnectivityTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const t1Start = Date.now();
    const res1 = await gql(ctx.endpoint, "{ __typename }");
    if (res1.status !== 200) throw new Error(`Status ${res1.status}`);
    if (res1.body?.data?.__typename !== "Query")
      throw new Error("Unexpected typename");
    results.push({
      name: "Basic Reachability",
      passed: true,
      duration: Date.now() - t1Start,
    });
  } catch (e) {
    results.push({
      name: "Basic Reachability",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t2Start = Date.now();
    const res2 = await gql(ctx.endpoint, "{ users(limit: 1) { id } }");
    const hasTypename = JSON.stringify(res2.body).includes("__typename");
    if (!hasTypename) throw new Error("__typename not found");
    results.push({
      name: "__typename Injection",
      passed: true,
      duration: Date.now() - t2Start,
    });
  } catch (e) {
    results.push({
      name: "__typename Injection",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t3Start = Date.now();
    const res3 = await gql(
      ctx.computeEndpoint,
      "{ __typename }",
      undefined,
      true
    );
    if (res3.status !== 200) throw new Error(`Compute failed: ${res3.status}`);
    results.push({
      name: "Compute Endpoint",
      passed: true,
      duration: Date.now() - t3Start,
    });
  } catch (e) {
    results.push({
      name: "Compute Endpoint",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  return results;
}

async function runCacheMechanicsTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const t1Start = Date.now();
    const uid = uniqueId();
    const query = `{ users(limit: 1, offset: ${uid}) { id } }`;

    const res1 = await gql(ctx.endpoint, query);
    if (!res1.isMiss) throw new Error("First should be MISS");

    const res2 = await gql(ctx.endpoint, query);
    if (!res2.isHit) throw new Error("Second should be HIT");

    results.push({
      name: "Basic Caching (MISS → HIT)",
      passed: true,
      duration: Date.now() - t1Start,
    });
  } catch (e) {
    results.push({
      name: "Basic Caching (MISS → HIT)",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t2Start = Date.now();
    const varQuery = "query GetUser($id: ID!) { user(id: $id) { id name } }";
    const vRes1 = await gql(ctx.endpoint, varQuery, { id: "1" });
    const vRes2 = await gql(ctx.endpoint, varQuery, { id: "2" });

    if (vRes1.body?.data?.user?.id !== "1") throw new Error("Var 1 failed");
    if (vRes2.body?.data?.user?.id !== "2") throw new Error("Var 2 failed");

    results.push({
      name: "Variable Sensitivity",
      passed: true,
      duration: Date.now() - t2Start,
    });
  } catch (e) {
    results.push({
      name: "Variable Sensitivity",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t3Start = Date.now();
    const res = await gql(ctx.endpoint, "{ stats { userCount } }");
    const hasCache = res.cacheControl || res.isHit || res.isMiss;
    if (!hasCache) throw new Error("Missing cache headers");

    results.push({
      name: "Cache Headers",
      passed: true,
      duration: Date.now() - t3Start,
    });
  } catch (e) {
    results.push({
      name: "Cache Headers",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t4Start = Date.now();
    const query = "{ stats { userCount } }";
    const promises = Array(5)
      .fill(null)
      .map(() => gql(ctx.endpoint, query));
    const responses = await Promise.all(promises);
    const allSuccess = responses.every((r) => r.status === 200);
    if (!allSuccess) throw new Error("Concurrent failed");

    results.push({
      name: "Concurrent Requests",
      passed: true,
      duration: Date.now() - t4Start,
    });
  } catch (e) {
    results.push({
      name: "Concurrent Requests",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  return results;
}

async function runSurrogateKeyTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const t1Start = Date.now();
    const res = await gql(
      ctx.computeEndpoint,
      "{ users(limit: 3) { id } }",
      undefined,
      true
    );
    const keys = res.surrogateKeys || "";
    const userKeys = keys.split(" ").filter((k) => k.startsWith("User:"));

    if (userKeys.length < 2) throw new Error(`Need 2+ users, got ${userKeys.length}`);
    results.push({
      name: "User Entity Extraction",
      passed: true,
      duration: Date.now() - t1Start,
    });
  } catch (e) {
    results.push({
      name: "User Entity Extraction",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t2Start = Date.now();
    const res = await gql(
      ctx.computeEndpoint,
      "{ posts(limit: 3) { id } }",
      undefined,
      true
    );
    const keys = res.surrogateKeys || "";
    const postKeys = keys.split(" ").filter((k) => k.startsWith("Post:"));

    if (postKeys.length < 2) throw new Error("Need 2+ posts");
    results.push({
      name: "Post Entity Extraction",
      passed: true,
      duration: Date.now() - t2Start,
    });
  } catch (e) {
    results.push({
      name: "Post Entity Extraction",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t3Start = Date.now();
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
    results.push({
      name: "Nested Query Entities",
      passed: true,
      duration: Date.now() - t3Start,
    });
  } catch (e) {
    results.push({
      name: "Nested Query Entities",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  return results;
}

async function runInvalidationTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const t1Start = Date.now();
    const uid = uniqueId();
    const mutQuery = `mutation { updateUser(id: "1", input: { name: "Test ${uid}" }) { id name } }`;
    const mutRes = await gql(ctx.endpoint, mutQuery);

    if (!mutRes.purgeKeys?.includes("User:1"))
      throw new Error("Missing purge key");
    results.push({
      name: "Update Mutation Purge",
      passed: true,
      duration: Date.now() - t1Start,
    });
  } catch (e) {
    results.push({
      name: "Update Mutation Purge",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t2Start = Date.now();
    const mutRes = await gql(
      ctx.endpoint,
      'mutation { updateUser(id: "2", input: { name: "Updated" }) { id } }'
    );
    const cc = mutRes.cacheControl.toLowerCase();
    if (!cc.includes("no-store") && !cc.includes("no-cache"))
      throw new Error("Mutation should not cache");

    results.push({
      name: "Mutation Cache Bypass",
      passed: true,
      duration: Date.now() - t2Start,
    });
  } catch (e) {
    results.push({
      name: "Mutation Cache Bypass",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  return results;
}

async function runEdgeCaseTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const t1Start = Date.now();
    const res = await gql(ctx.endpoint, "{ invalidField }");
    if (!res.body?.errors) throw new Error("Should return errors");
    results.push({
      name: "Invalid Query Handling",
      passed: true,
      duration: Date.now() - t1Start,
    });
  } catch (e) {
    results.push({
      name: "Invalid Query Handling",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  try {
    const t2Start = Date.now();
    const res = await gql(ctx.endpoint, '{ user(id: "99999") { id } }');
    if (res.status >= 500) throw new Error("Server error");
    results.push({
      name: "Non-existent ID",
      passed: true,
      duration: Date.now() - t2Start,
    });
  } catch (e) {
    results.push({
      name: "Non-existent ID",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  return results;
}

async function runResiliencyTests(ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    const t1Start = Date.now();
    const uid = uniqueId();
    const query = `{ users(limit: 1, offset: ${uid}) { id } }`;

    const first = await gql(ctx.endpoint, query);
    if (!first.isMiss) throw new Error("First should be MISS");

    await sleep(CONFIG.cachePersistenceDelay);

    const second = await gql(ctx.endpoint, query);
    if (!second.isHit) throw new Error("Second should be HIT");

    results.push({
      name: "Cache Persistence",
      passed: true,
      duration: Date.now() - t1Start,
    });
  } catch (e) {
    results.push({
      name: "Cache Persistence",
      passed: false,
      error: (e as Error).message,
      duration: 0,
    });
  }

  return results;
}

export async function runCacheTests(): Promise<void> {
  log.info("ORION Cache Verification Suite");
  console.log("─".repeat(40));

  let endpoint: string;
  let computeEndpoint: string;

  try {
    const output = getTerraformOutput();
    endpoint = `https://${output.cdn_service.domain_name}/graphql`;
    computeEndpoint = `https://${output.compute_service.domain_name}/graphql`;
  } catch {
    log.error("Failed to get endpoints. Is infrastructure deployed?");
    return;
  }

  console.log(`\n  VCL Endpoint:     ${endpoint}`);
  console.log(`  Compute Endpoint: ${computeEndpoint}\n`);

  const ctx: TestContext = { endpoint, computeEndpoint };

  const suiteRunners = [
    { name: "Connectivity", run: runConnectivityTests },
    { name: "Cache Mechanics", run: runCacheMechanicsTests },
    { name: "Surrogate Keys", run: runSurrogateKeyTests },
    { name: "Invalidation", run: runInvalidationTests },
    { name: "Edge Cases", run: runEdgeCaseTests },
    { name: "Resiliency", run: runResiliencyTests },
  ];

  const suiteResults: TestSuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suiteRunners) {
    const s = spinner();
    s.start(`Running ${suite.name} Tests...`);

    try {
      const results = await suite.run(ctx);
      suiteResults.push({ name: suite.name, results });

      const passed = results.filter((r: TestResult) => r.passed).length;
      const failed = results.length - passed;
      totalPassed += passed;
      totalFailed += failed;

      s.stop(`${suite.name}: ${passed}/${results.length} passed`);

      for (const r of results) {
        if (r.passed) {
          console.log(`    ✓ ${r.name} (${r.duration}ms)`);
        } else {
          console.log(`    ✗ ${r.name}: ${r.error}`);
        }
      }
    } catch (e) {
      s.stop(`${suite.name}: Error`);
      console.log(`    Error: ${(e as Error).message}`);
    }
  }

  console.log("\n" + "─".repeat(40));
  if (totalFailed === 0) {
    log.success(`All ${totalPassed} tests passed!`);
  } else {
    log.error(`${totalFailed} failed, ${totalPassed} passed`);
  }
}
