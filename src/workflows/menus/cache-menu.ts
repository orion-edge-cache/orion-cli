import { outro } from "@clack/prompts";
import { askExistingState } from "../../ui/prompts";
import { handleDestroyDeployment } from "../handlers/deployment";
import { handlePurgeCache } from "../handlers/cache";
import { handleViewDetails } from "../handlers/monitoring";
import { handleSchemaMenu } from "../handlers/schema";
import { runConfigMenu } from "./config-menu";

export const runCacheMenu = async (): Promise<boolean> => {
  let continueLoop = true;
  while (continueLoop) {
    const choice = await askExistingState();
    if (!choice) break;

    if (choice === "view") {
      await handleViewDetails();
      continue;
    }

    if (choice === "config") {
      await runConfigMenu();
      continue;
    }

    if (choice === "schema") {
      await handleSchemaMenu();
      continue;
    }

    if (choice === "purge") {
      await handlePurgeCache();
      continue;
    }

    if (choice === "destroy") {
      continueLoop = await handleDestroyDeployment();
      continue;
    }

    if (choice === "exit") {
      outro("Goodbye!");
      process.exit(0);
    }
  }
  return true;
};
