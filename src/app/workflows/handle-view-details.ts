import { select, isCancel } from "@clack/prompts";
import { displayHeader, displayOutput } from "../../ui/display";
import { getTerraformOutputs } from "@orion/infra";
import { unwrapTerraformOutput } from "../../shared";

export const handleViewDetails = async () => {
  displayHeader("View Details");
  const output = unwrapTerraformOutput(getTerraformOutputs());
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