import { deployCompute } from "@orion/infra";

export const handleComputeDeploy = () => {
  const fastlyToken = process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;
  if (!fastlyToken) {
    console.error("Error: FASTLY_API_KEY or FASTLY_API_TOKEN environment variable is required");
    return;
  }
  deployCompute(fastlyToken);
  console.log();
};