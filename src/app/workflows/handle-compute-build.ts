import { getTerraformOutput } from "@orion/infra";
import { processComputeTemplates, buildCompute } from "@orion/infra";

export const handleComputeBuild = () => {
  const output = getTerraformOutput();
  processComputeTemplates(output);
  buildCompute();
  console.log();
};