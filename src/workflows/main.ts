import { spinner, log } from "@clack/prompts";
import {
  askInitialAction,
  askReadmeAction,
  promptForDestroyCredentials,
} from "../ui/prompts";
import { displayReadme, displayLogo } from "../ui/display";
import { destroyInfrastructure, checkTfStateExists } from "@orion/infra";
import { handleExistingDeployment, handleNewDeployment } from "./deployment";

export const runSetupWorkflow = async (): Promise<void> => {
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

      await handleNewDeployment();
    }

    if (initialAction === "view") {
      await handleExistingDeployment();
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
