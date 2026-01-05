import { outro } from "@clack/prompts";
import { askExistingState } from "../../ui/prompts";
import { handleCachePurge } from "./handle-cache-purge";
import { handleCacheTests } from "./handle-cache-tests";
import { handleComputeBuild } from "./handle-compute-build";
import { handleComputeDeploy } from "./handle-compute-deploy";
import { handleConfigManagement } from "./handle-config-management";
import { handleDestroy } from "./handle-destroy";
import { handleKinesisTail } from "./handle-kinesis-tail";
import { handleLoadTest } from "./handle-load-test";
import { handleViewDetails } from "./handle-view-details";

export const handleExistingState = async (): Promise<boolean> => {
  let continueLoop = true;
  while (continueLoop) {
    const choice = await askExistingState();
    if (!choice) break;

    if (choice === "destroy") {
      continueLoop = await handleDestroy();
      continue;
    }

    if (choice === "view") {
      await handleViewDetails();
      continue;
    }

    if (choice === "tail") {
      await handleKinesisTail();
      continueLoop = true;
      continue;
    }

    if (choice === "build") {
      handleComputeBuild();
      continue;
    }

    if (choice === "deploy") {
      handleComputeDeploy();
      continue;
    }

    if (choice === "purge") {
      await handleCachePurge();
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
      await handleConfigManagement();
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