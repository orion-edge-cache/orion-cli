import { spinner, log } from "@clack/prompts";
import { askInitialAction, askReadmeAction } from "../../ui/prompts";
import { displayReadme, displayLogo } from "../../ui/display";
import {
  destroyTerraform,
  deleteTfState,
  checkTfStateExists,
} from "@orion/infra";
import { handleExistingState } from "./existing-deployment";
import { handleNewState } from "./new-deployment";

export const runSetupWorkflow = async (): Promise<void> => {
  let continueLoop = true;
  while (continueLoop) {
    const initialAction = await askInitialAction();

    if (initialAction === "exit") {
      break;
    }

    if (initialAction === "create") {
      if (checkTfStateExists()) {
        const resources = destroyTerraform();

        resources.forEach((resource: string) => {
          const s = spinner();
          s.start(`Destroying ${resource}`);
          s.stop(`✓ ${resource} destroyed`);
        });
        deleteTfState();
        log.success("✓ Old cache infrastructure destroyed");
      }
      await handleNewState();
    }

    if (initialAction === "view") {
      await handleExistingState();
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