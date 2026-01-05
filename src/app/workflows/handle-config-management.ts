import { isCancel, select, spinner } from "@clack/prompts";
import { askConfigMenu } from "../../ui/prompts";
import { displayHeader } from "../../ui/display";
import {
  ensureConfigExists,
  readConfig,
  editConfigInEditor,
  hasConfigChanged,
  deployConfigChanges,
} from "../../config";
import { getTerraformOutput } from "@orion/infra";

export const handleConfigManagement = async () => {
  ensureConfigExists();
  let configMenuLoop = true;
  while (configMenuLoop) {
    const configChoice = await askConfigMenu();
    if (!configChoice) {
      configMenuLoop = false;
      continue;
    }

    if (configChoice === "view") {
      displayHeader("Config › View");
      const configContent = readConfig();
      console.log("\n");
      console.log(configContent);
      const back = (await select({
        message: "Return to Menu",
        options: [{ value: "back", label: "Enter" }],
      })) as string;
      if (isCancel(back)) {
        continue;
      }
    } else if (configChoice === "edit") {
      await editConfigInEditor();
      displayHeader("Config");
      console.log("✓ Config file saved");
      const back = (await select({
        message: "Return to Menu",
        options: [{ value: "back", label: "Enter" }],
      })) as string;
      if (isCancel(back)) {
        continue;
      }
    } else if (configChoice === "deploy") {
      if (!hasConfigChanged()) {
        displayHeader("Config");
        console.log("ℹ No config changes to deploy");
        const back = (await select({
          message: "Return to Menu",
          options: [{ value: "back", label: "Enter" }],
        })) as string;
        if (isCancel(back)) {
          continue;
        }
      } else {
        displayHeader("Config › Deploy");
        const s = spinner();
        s.start("Deploying config changes");
        const terraformOutput = getTerraformOutput();
        deployConfigChanges(terraformOutput);
        s.stop("✓ Config changes deployed");
        const back = (await select({
          message: "Return to Menu",
          options: [{ value: "back", label: "Enter" }],
        })) as string;
        if (isCancel(back)) {
          continue;
        }
      }
    } else if (configChoice === "back") {
      configMenuLoop = false;
    }
  }
};