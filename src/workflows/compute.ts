import { getTerraformOutputs, processComputeTemplates, buildCompute, deployCompute } from "@orion/infra";
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

export const handleComputeDeploy = () => {
  const fastlyToken = process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;
  if (!fastlyToken) {
    console.error("Error: FASTLY_API_KEY or FASTLY_API_TOKEN environment variable is required");
    return;
  }
  deployCompute(fastlyToken);
  console.log();
};
