/**
 * ORION Load Test
 * 
 * High-volume cache performance testing with statistics.
 * Ported from the original CLI with @clack/prompts integration.
 */

import { spinner, log, text, isCancel } from "@clack/prompts";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../shared";

interface RequestResult {
  type: string;
  status: number;
  duration: number;
  cacheStatus: "HIT" | "MISS" | "BYPASS" | "UNKNOWN";
  hasSurrogateKeys: boolean;
  hasPurgeKeys: boolean;
  error?: string;
}

interface LoadTestStats {
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

const QUERIES = {
  users: "{ users { id name email } }",
  posts: "{ posts { id title body user_id } }",
  comments: "{ comments { id body post_id user_id } }",
  userById: (id: string) => `{ user(id: "${id}") { id name email } }`,
  postById: (id: string) => `{ post(id: "${id}") { id title body user_id } }`,
  commentById: (id: string) => `{ comment(id: "${id}") { id body post_id user_id } }`,
};

const MUTATIONS = {
  updateUser: (id: string, name: string, email: string) =>
    `mutation { updateUser(id: "${id}", name: "${name}", email: "${email}") { id name } }`,
  createPost: (title: string, userId: string) =>
    `mutation { createPost(title: "${title}", user_id: "${userId}", body: "Load test content") { id title } }`,
  deletePost: (id: string) =>
    `mutation { deletePost(id: "${id}") { id } }`,
  createComment: (postId: string, userId: string) =>
    `mutation { createComment(post_id: "${postId}", user_id: "${userId}", body: "Test comment") { id } }`,
};

async function sendRequest(
  endpoint: string,
  query: string,
  type: string
): Promise<RequestResult> {
  const start = Date.now();

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Fastly-Debug": "1",
      },
      body: JSON.stringify({ query }),
    });

    const duration = Date.now() - start;
    const cacheHeader = res.headers.get("x-cache") || "";

    let cacheStatus: "HIT" | "MISS" | "BYPASS" | "UNKNOWN" = "UNKNOWN";
    if (cacheHeader.includes("HIT")) cacheStatus = "HIT";
    else if (cacheHeader.includes("MISS")) cacheStatus = "MISS";
    else if (cacheHeader.includes("BYPASS") || cacheHeader.includes("PASS"))
      cacheStatus = "BYPASS";

    return {
      type,
      status: res.status,
      duration,
      cacheStatus,
      hasSurrogateKeys: !!res.headers.get("surrogate-key"),
      hasPurgeKeys: !!res.headers.get("x-purge-keys"),
    };
  } catch (error) {
    return {
      type,
      status: 0,
      duration: Date.now() - start,
      cacheStatus: "UNKNOWN",
      hasSurrogateKeys: false,
      hasPurgeKeys: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function calculateStats(results: RequestResult[]): LoadTestStats {
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
    avgLatency: sum / latencies.length,
    minLatency: latencies[0] || 0,
    maxLatency: latencies[latencies.length - 1] || 0,
    p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
    p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
    p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
  };
}

export async function runLoadTest(): Promise<void> {
  log.info("ORION Load Test");
  console.log("─".repeat(40));

  let endpoint: string;

  try {
    const output = unwrapTerraformOutput(getTerraformOutputs());
    endpoint = `https://${output.cdn_service.domain_name}/graphql`;
  } catch {
    log.error("Failed to get endpoint. Is infrastructure deployed?");
    return;
  }

  const countInput = await text({
    message: "Number of requests?",
    placeholder: "1000",
    defaultValue: "1000",
    validate: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 1) return "Enter a valid number";
    },
  });

  if (isCancel(countInput)) return;

  const totalRequests = parseInt(countInput as string, 10);
  const queryCount = Math.floor(totalRequests * 0.7);
  const mutationCount = totalRequests - queryCount;

  console.log(`\n  Endpoint: ${endpoint}`);
  console.log(`  Total: ${totalRequests} (70% queries, 30% mutations)\n`);

  const s = spinner();
  s.start(`Sending ${totalRequests} requests...`);

  const results: RequestResult[] = [];

  const queryTypes = [
    "users",
    "posts",
    "comments",
    "userById",
    "postById",
    "commentById",
  ];

  for (let i = 0; i < queryCount; i++) {
    const queryType = queryTypes[i % queryTypes.length];
    const userId = String((i % 20) + 1);
    const postId = String((i % 50) + 1);
    const commentId = String((i % 30) + 1);

    let query: string;
    switch (queryType) {
      case "users":
        query = QUERIES.users;
        break;
      case "posts":
        query = QUERIES.posts;
        break;
      case "comments":
        query = QUERIES.comments;
        break;
      case "userById":
        query = QUERIES.userById(userId);
        break;
      case "postById":
        query = QUERIES.postById(postId);
        break;
      case "commentById":
        query = QUERIES.commentById(commentId);
        break;
      default:
        query = QUERIES.users;
    }

    results.push(await sendRequest(endpoint, query, `query:${queryType}`));

    if ((i + 1) % 100 === 0) {
      s.message(`Progress: ${i + 1}/${totalRequests}...`);
    }
  }

  const mutationTypes = ["updateUser", "createPost", "deletePost", "createComment"];

  for (let i = 0; i < mutationCount; i++) {
    const mutationType = mutationTypes[i % mutationTypes.length];
    const uid = Date.now().toString().slice(-6) + i;
    const userId = String((i % 20) + 1);
    const postId = String((i % 50) + 1);

    let query: string;
    switch (mutationType) {
      case "updateUser":
        query = MUTATIONS.updateUser(userId, `User ${uid}`, `user${uid}@test.com`);
        break;
      case "createPost":
        query = MUTATIONS.createPost(`Post ${uid}`, userId);
        break;
      case "deletePost":
        query = MUTATIONS.deletePost(postId);
        break;
      case "createComment":
        query = MUTATIONS.createComment(postId, userId);
        break;
      default:
        query = MUTATIONS.updateUser("1", `Test ${uid}`, `user${uid}@test.com`);
    }

    results.push(await sendRequest(endpoint, query, `mutation:${mutationType}`));

    if ((queryCount + i + 1) % 100 === 0) {
      s.message(`Progress: ${queryCount + i + 1}/${totalRequests}...`);
    }
  }

  s.stop("Requests complete!");

  const stats = calculateStats(results);

  console.log("\n" + "─".repeat(40));
  log.info("Results");

  console.log("\n  Request Distribution");
  console.log(`    Total:     ${stats.total}`);
  console.log(`    Queries:   ${stats.queries}`);
  console.log(`    Mutations: ${stats.mutations}`);

  console.log("\n  Cache Performance");
  console.log(`    Hits:      ${stats.cacheHits}`);
  console.log(`    Misses:    ${stats.cacheMisses}`);
  console.log(
    `    Hit Rate:  ${((stats.cacheHits / stats.total) * 100).toFixed(1)}%`
  );

  console.log("\n  Latency (ms)");
  console.log(`    Average:   ${stats.avgLatency.toFixed(2)}`);
  console.log(`    Min:       ${stats.minLatency}`);
  console.log(`    Max:       ${stats.maxLatency}`);
  console.log(`    P50:       ${stats.p50}`);
  console.log(`    P95:       ${stats.p95}`);
  console.log(`    P99:       ${stats.p99}`);

  const hitLatencies = results
    .filter((r) => r.cacheStatus === "HIT")
    .map((r) => r.duration);
  const missLatencies = results
    .filter((r) => r.cacheStatus === "MISS")
    .map((r) => r.duration);

  if (hitLatencies.length > 0 && missLatencies.length > 0) {
    const avgHit =
      hitLatencies.reduce((a, b) => a + b, 0) / hitLatencies.length;
    const avgMiss =
      missLatencies.reduce((a, b) => a + b, 0) / missLatencies.length;

    console.log("\n  Latency Comparison");
    console.log(`    Avg HIT:   ${avgHit.toFixed(2)}ms`);
    console.log(`    Avg MISS:  ${avgMiss.toFixed(2)}ms`);
    console.log(`    Speedup:   ${(avgMiss / avgHit).toFixed(1)}x faster`);
  }

  console.log("\n  Errors");
  console.log(`    Total:     ${stats.errors}`);
  console.log(
    `    Rate:      ${((stats.errors / stats.total) * 100).toFixed(2)}%`
  );

  console.log("\n" + "─".repeat(40));

  if (stats.errors === 0) {
    log.success("Load test passed!");
  } else {
    log.warning(`${stats.errors} errors detected`);
  }
}
