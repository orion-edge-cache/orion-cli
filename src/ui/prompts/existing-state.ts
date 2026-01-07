import { isCancel, select, spinner } from "@clack/prompts";
import { displayHeader } from "../display";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../../shared";

export const askExistingState = async () => {
  displayHeader("Cache Menu");
  try {
    let s: ReturnType<typeof spinner> | undefined;
    const output = unwrapTerraformOutput(
      await getTerraformOutputs(() => {
        console.log("Initializing Terraform...");
      }),
    );
    const cdnDomain = output.cdn_service.domain_name;
    console.log(`\nCurrent Cache URL: https://${cdnDomain}/graphql\n`);
  } catch (error) {
    // Silently fail if unable to get output
  }
  const choice = (await select({
    message: "What would you like to do?",
    options: [
      { value: "view", label: "1. Show Details" },
      { value: "config", label: "2. Config" },
      { value: "schema", label: "3. Schema Analysis & AI Config" },
      { value: "purge", label: "4. Purge Cache" },
      { value: "destroy", label: "5. Destroy Cache" },
      { value: "exit", label: "6. Exit" },
    ],
  })) as string;

  if (isCancel(choice)) {
    return false;
  }

  return choice;
};
