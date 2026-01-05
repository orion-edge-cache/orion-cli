import "dotenv/config";

import { runSetupWorkflow } from "./src/app/workflows";
import { ensureApiKeys } from "./src/ui/prompts";

const main = async () => {
  await ensureApiKeys();
  await runSetupWorkflow();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
