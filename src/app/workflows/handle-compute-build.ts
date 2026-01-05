import { getTerraformOutputs, processComputeTemplates, buildCompute } from "@orion/infra";
import { spinner } from "@clack/prompts";

export const handleComputeBuild = () => {
  let s: ReturnType<typeof spinner> | undefined;
  const output = getTerraformOutputs(() => {
    s = spinner();
    s.start("Initializing Terraform...");
  });
  if (s) {
    s.stop("Terraform initialized");
  }
  processComputeTemplates(output);
  buildCompute();
  console.log();
};

// Note: processComputeTemplates expects raw TerraformOutput with .value wrappers