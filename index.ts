import "dotenv/config";

import { runSetupWorkflow } from "./src/workflows";

const main = async () => {
  await runSetupWorkflow();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
