import { isCancel, select, log } from "@clack/prompts";
import { displayHeader } from "../display";

export const askDemoTools = async () => {
  displayHeader("Demo Tools");
  
  log.warn("⚠️  Demo Tools are specifically designed for the Orion Demo App.");
  log.warn("   They may not work with other GraphQL servers.");
  console.log();
  log.info("   Demo app setup: https://github.com/orion-edge-cache/orion-demo-app");
  console.log();
  
  const choice = (await select({
    message: "Select a demo tool:",
    options: [
      { value: "cache-tests", label: "1. Run Cache Tests" },
      { value: "analytics", label: "2. Generate Analytics" },
      { value: "back", label: "3. Back to Main Menu" },
    ],
  })) as string;

  if (isCancel(choice)) {
    return false;
  }

  return choice;
};
