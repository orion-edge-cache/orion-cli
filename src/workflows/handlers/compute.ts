import { getTerraformOutputs, processComputeTemplates, buildCompute, deployCompute } from "@orion/infra";
import { spinner } from "@clack/prompts";

export const handleComputeBuild = async () => {
  let s: ReturnType<typeof spinner> | undefined;
  const output = await getTerraformOutputs(() => {
    s = spinner();
    s.start("Initializing Terraform...");
  });
  if (s) {
    s.stop("Terraform initialized");
  }
  await processComputeTemplates(output);
  await buildCompute();
  console.log();
};

// Note: processComputeTemplates expects raw TerraformOutput with .value wrappers

export const handleComputeDeploy = async () => {
  const fastlyToken = process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;
  if (!fastlyToken) {
    console.error("Error: FASTLY_API_KEY or FASTLY_API_TOKEN environment variable is required");
    return;
  }
  await deployCompute(fastlyToken);
  console.log();
};
