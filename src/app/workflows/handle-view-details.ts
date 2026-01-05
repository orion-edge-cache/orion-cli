import { select, isCancel } from "@clack/prompts";
import { displayHeader, displayOutput } from "../../ui/display";
import { getTerraformOutput } from "@orion/infra";

export const handleViewDetails = async () => {
  displayHeader("View Details");
  const output = getTerraformOutput();
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