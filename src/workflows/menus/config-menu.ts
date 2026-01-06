import { askConfigMenu } from "../../ui/prompts";
import { ensureConfigExists } from "../../config";
import {
  handleViewConfig,
  handleEditConfig,
  handleDeployConfig,
} from "../handlers/config";

export const runConfigMenu = async (): Promise<void> => {
  ensureConfigExists();
  let configMenuLoop = true;
  while (configMenuLoop) {
    const configChoice = await askConfigMenu();
    if (!configChoice) {
      configMenuLoop = false;
      continue;
    }

    if (configChoice === "view") {
      await handleViewConfig();
    } else if (configChoice === "edit") {
      await handleEditConfig();
    } else if (configChoice === "deploy") {
      await handleDeployConfig();
    } else if (configChoice === "back") {
      configMenuLoop = false;
    }
  }
};
