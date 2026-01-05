import { select, isCancel, spinner } from "@clack/prompts";
import { displayHeader, displayOutput } from "../../ui/display";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../../shared";

export const handleViewDetails = async () => {
  displayHeader("View Details");
  
  let s: ReturnType<typeof spinner> | undefined;
  const output = unwrapTerraformOutput(
    getTerraformOutputs(() => {
      s = spinner();
      s.start("Initializing Terraform...");
    })
  );
  
  if (s) {
    s.stop("Terraform initialized");
  }
  
  console.log("\n");
  displayOutput(output);
  const back = (await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  })) as string;
  if (isCancel(back)) {
    return;
  }
};