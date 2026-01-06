/**
 * ORION Load Test
 *
 * High-volume cache performance testing with statistics.
 */

import { spinner, log, text, isCancel } from "@clack/prompts";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../shared/index.js";
import {
  sendRequest,
  getQuery,
  getMutation,
  calculateStats,
  printDivider,
  printLoadTestStats,
  printLatencyComparison,
  printErrorSummary,
  printLoadTestResult,
  printLoadTestConfig,
  QUERY_TYPES,
  MUTATION_TYPES,
  type RequestResult,
} from "./utils/index.js";

async function sendQueries(
  endpoint: string,
  count: number,
  onProgress: (completed: number) => void
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];

  for (let i = 0; i < count; i++) {
    const queryType = QUERY_TYPES[i % QUERY_TYPES.length]!;
    const userId = String((i % 20) + 1);
    const postId = String((i % 50) + 1);
    const commentId = String((i % 30) + 1);

    const query = getQuery(queryType, { userId, postId, commentId });
    results.push(await sendRequest(endpoint, query, `query:${queryType}`));

    if ((i + 1) % 100 === 0) {
      onProgress(i + 1);
    }
  }

  return results;
}

async function sendMutations(
  endpoint: string,
  count: number,
  startIndex: number,
  onProgress: (completed: number) => void
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];

  for (let i = 0; i < count; i++) {
    const mutationType = MUTATION_TYPES[i % MUTATION_TYPES.length]!;
    const uid = Date.now().toString().slice(-6) + i;
    const userId = String((i % 20) + 1);
    const postId = String((i % 50) + 1);

    const query = getMutation(mutationType, { userId, postId, uid });
    results.push(await sendRequest(endpoint, query, `mutation:${mutationType}`));

    if ((startIndex + i + 1) % 100 === 0) {
      onProgress(startIndex + i + 1);
    }
  }

  return results;
}

export async function runLoadTest(): Promise<void> {
  log.info("ORION Load Test");
  printDivider();

  let endpoint: string;

  try {
    let s: ReturnType<typeof spinner> | undefined;
    const output = unwrapTerraformOutput(
      getTerraformOutputs(() => {
        s = spinner();
        s.start("Initializing Terraform...");
      })
    );
    if (s) {
      s.stop("Terraform initialized");
    }
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

  printLoadTestConfig(totalRequests, endpoint);

  const s = spinner();
  s.start(`Sending ${totalRequests} requests...`);

  const queryResults = await sendQueries(endpoint, queryCount, (completed) => {
    s.message(`Progress: ${completed}/${totalRequests}...`);
  });

  const mutationResults = await sendMutations(
    endpoint,
    mutationCount,
    queryCount,
    (completed) => {
      s.message(`Progress: ${completed}/${totalRequests}...`);
    }
  );

  s.stop("Requests complete!");

  const results = [...queryResults, ...mutationResults];
  const stats = calculateStats(results);

  console.log();
  printDivider();
  log.info("Results");

  printLoadTestStats(stats);
  printLatencyComparison(results);
  printErrorSummary(stats);

  console.log();
  printLoadTestResult(stats);
}
