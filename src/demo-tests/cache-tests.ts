/**
 * Demo Cache Test Suite
 * 
 * Comprehensive testing for GraphQL edge caching functionality.
 * All requests go through the VCL endpoint, which forwards to Compute on cache miss.
 */

import { spinner, log } from "@clack/prompts";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../shared/index.js";
import {
  runAllSuites,
  printDivider,
  printEndpoint,
  printFinalSummary,
  type Endpoints,
  type TestSuite,
} from "./utils/index.js";
import {
  runConnectivitySuite,
  runCacheMechanicsSuite,
  runSurrogateKeysSuite,
  runInvalidationSuite,
  runEdgeCasesSuite,
} from "./suites/index.js";

/**
 * Get the VCL endpoint from Terraform outputs
 */
async function getEndpoints(): Promise<Endpoints | null> {
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

    return {
      vclService: `https://${output.cdn_service.domain_name}/graphql`,
    };
  } catch {
    return null;
  }
}

/**
 * Build the list of test suites to run
 */
function buildTestSuites(): TestSuite[] {
  return [
    { name: "Connectivity", run: runConnectivitySuite },
    { name: "Cache Mechanics", run: runCacheMechanicsSuite },
    { name: "Surrogate Keys", run: runSurrogateKeysSuite },
    { name: "Invalidation", run: runInvalidationSuite },
    { name: "Edge Cases", run: runEdgeCasesSuite },
  ];
}

/**
 * Run the demo cache test suite
 */
export async function runDemoCacheTests(): Promise<void> {
  log.info("ORION Demo Cache Test Suite");
  printDivider();

  const endpoints = await getEndpoints();
  if (!endpoints) {
    log.error("Failed to get endpoints. Is infrastructure deployed?");
    return;
  }

  printEndpoint(endpoints.vclService);

  const suites = buildTestSuites();
  const summary = await runAllSuites(suites, endpoints);

  printFinalSummary(summary.totalPassed, summary.totalFailed);
}
