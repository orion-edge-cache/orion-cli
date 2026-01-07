import { runCacheTests, runAnalyticsGenerator } from "@orion/demo-tools";

/**
 * Handler for running cache tests from the demo tools package
 */
export const handleRunCacheTests = async (): Promise<void> => {
  await runCacheTests();
};

/**
 * Handler for generating analytics from the demo tools package
 */
export const handleGenerateAnalytics = async (): Promise<void> => {
  await runAnalyticsGenerator();
};
