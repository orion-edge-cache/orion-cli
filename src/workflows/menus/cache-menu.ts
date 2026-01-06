import { outro } from "@clack/prompts";
import { askExistingState } from "../../ui/prompts";
import { handleDestroyDeployment } from "../handlers/deployment";
import { handlePurgeCache } from "../handlers/cache";
import { handleComputeBuild, handleComputeDeploy } from "../handlers/compute";
import { handleViewDetails, handleTailKinesis } from "../handlers/monitoring";
import { handleCacheTests, handleLoadTest } from "../handlers/testing";
import { handleSchemaMenu } from "../handlers/schema";
import { runConfigMenu } from "./config-menu";

export const runCacheMenu = async (): Promise<boolean> => {
  let continueLoop = true;
  while (continueLoop) {
    const choice = await askExistingState();
    if (!choice) break;

    if (choice === "destroy") {
      continueLoop = await handleDestroyDeployment();
      continue;
    }

    if (choice === "view") {
      await handleViewDetails();
      continue;
    }

    if (choice === "tail") {
      await handleTailKinesis();
      continueLoop = true;
      continue;
    }

    if (choice === "build") {
      await handleComputeBuild();
      continue;
    }

    if (choice === "deploy") {
      await handleComputeDeploy();
      continue;
    }

    if (choice === "purge") {
      await handlePurgeCache();
      continue;
    }

    if (choice === "test") {
      await handleCacheTests();
      continue;
    }

    if (choice === "load-test") {
      await handleLoadTest();
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

    if (choice === "back") {
      continueLoop = false;
    }

    if (choice === "exit") {
      outro("Goodbye!");
      process.exit(0);
    }
  }
  return true;
};
