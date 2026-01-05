import { getTerraformOutputs, processComputeTemplates, buildCompute } from "@orion/infra";

export const handleComputeBuild = () => {
  const output = getTerraformOutputs();
  processComputeTemplates(output);
  buildCompute();
  console.log();
};

// Note: processComputeTemplates expects raw TerraformOutput with .value wrappers