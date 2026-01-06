import { isCancel, select, spinner } from "@clack/prompts";
import { displayHeader } from "../../ui/display";
import {
  readConfig,
  editConfigInEditor,
  hasConfigChanged,
  deployConfigChanges,
} from "../../config";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../../shared";

export const handleViewConfig = async () => {
  displayHeader("Config > View");
  const configContent = readConfig();
  console.log("\n");
  console.log(configContent);
  const back = (await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  })) as string;
  if (isCancel(back)) {
    return;
  }
};

export const handleEditConfig = async () => {
  await editConfigInEditor();
  displayHeader("Config");
  console.log("Config file saved");
  const back = (await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  })) as string;
  if (isCancel(back)) {
    return;
  }
};

export const handleDeployConfig = async () => {
  if (!hasConfigChanged()) {
    displayHeader("Config");
    console.log("No config changes to deploy");
    const back = (await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    })) as string;
    if (isCancel(back)) {
      return;
    }
  } else {
    displayHeader("Config > Deploy");
    let s = spinner();
    s.start("Deploying config changes");
    const terraformOutput = unwrapTerraformOutput(
      await getTerraformOutputs(() => {
        s.message("Initializing Terraform...");
      })
    );
    deployConfigChanges(terraformOutput);
    s.stop("Config changes deployed");
    const back = (await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    })) as string;
    if (isCancel(back)) {
      return;
    }
  }
};
