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
    message: "Terraform state file exists. What would you like to do?",
    options: [
      { value: "view", label: "1. View Details" },
      { value: "tail", label: "2. Tail Kinesis" },
      { value: "build", label: "3. Build Fastly Compute" },
      { value: "deploy", label: "4. Deploy Fastly Compute" },
      { value: "config", label: "5. Config" },
      { value: "schema", label: "6. Schema Analysis & AI Config" },
      { value: "purge", label: "7. Purge All Cache" },
      { value: "test", label: "8. Run Cache Tests" },
      { value: "load-test", label: "9. Run Load Test" },
      { value: "destroy", label: "10. Destroy existing cache" },
      { value: "back", label: "11. Back to menu" },
      { value: "exit", label: "12. Exit" },
    ],
  })) as string;

  if (isCancel(choice)) {
    return false;
  }

  return choice;
};
