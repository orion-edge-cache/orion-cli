import { spinner, log } from "@clack/prompts";
import {
  askInitialAction,
  askReadmeAction,
  promptForDestroyCredentials,
} from "../../ui/prompts";
import { displayReadme, displayLogo } from "../../ui/display";
import { destroyInfrastructure, checkTfStateExists } from "@orion/infra";
import { handleCreateDeployment } from "../handlers/deployment";
import { handleDeployDemoApp } from "../handlers/demo-app";
import { runCacheMenu } from "./cache-menu";
import { runDevMenu } from "./dev-menu";
import { runDemoToolsMenu } from "./demo-tools-menu";

export const runSetupMenu = async (): Promise<void> => {
  let continueLoop = true;
  while (continueLoop) {
    const initialAction = await askInitialAction();

    if (initialAction === "exit") {
      break;
    }

    if (initialAction === "create") {
      // Destroy existing infrastructure first if it exists
      if (checkTfStateExists()) {
        log.warn(
          "Existing infrastructure detected. It must be destroyed first."
        );

        const destroyConfig = await promptForDestroyCredentials();
        if (!destroyConfig) continue; // User cancelled, return to menu

        const s = spinner();
        try {
          s.start("Destroying existing infrastructure...");
          await destroyInfrastructure(destroyConfig);
          s.stop("Old cache infrastructure destroyed");
        } catch (error) {
          s.stop("Failed to destroy existing infrastructure");
          log.error((error as Error).message);
          continue; // Return to menu
        }
      }

      await handleCreateDeployment();
    }

    if (initialAction === "deploy-demo") {
      await handleDeployDemoApp();
      // After deploying demo app, return to menu so user can create edge cache
      continue;
    }

    if (initialAction === "view") {
      await runCacheMenu();
    }

    if (initialAction === "dev-options") {
      await runDevMenu();
    }

    if (initialAction === "demo-tools") {
      await runDemoToolsMenu();
    }

    if (initialAction === "readme") {
      displayReadme();
      const nextAction: string | false = await askReadmeAction();
      if (nextAction === "back") {
        continueLoop = true;
      } else if (nextAction === "exit") {
        continueLoop = false;
      }
    }
  }
  displayLogo();
  log.info("Goodbye");
};
