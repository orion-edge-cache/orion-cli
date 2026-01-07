import { outro } from "@clack/prompts";
import { askDevOptions } from "../../ui/prompts/dev-options.js";
import { handleComputeBuild, handleComputeDeploy } from "../handlers/compute.js";
import { handleTailKinesis } from "../handlers/monitoring.js";

export const runDevMenu = async (): Promise<boolean> => {
  let continueLoop = true;
  while (continueLoop) {
    const choice = await askDevOptions();
    if (!choice) break;

    if (choice === "tail") {
      await handleTailKinesis();
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

    if (choice === "back") {
      continueLoop = false;
    }
  }
  return true;
};
