import { askDemoTools } from "../../ui/prompts/demo-tools.js";
import { handleRunCacheTests, handleGenerateAnalytics } from "../handlers/demo-tools.js";

export const runDemoToolsMenu = async (): Promise<boolean> => {
  let continueLoop = true;
  while (continueLoop) {
    const choice = await askDemoTools();
    if (!choice) break;

    if (choice === "cache-tests") {
      await handleRunCacheTests();
      continue;
    }

    if (choice === "analytics") {
      await handleGenerateAnalytics();
      continue;
    }

    if (choice === "back") {
      continueLoop = false;
    }
  }
  return true;
};
