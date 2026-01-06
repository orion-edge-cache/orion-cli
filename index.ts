import "dotenv/config";

import { menus } from "./src/workflows";

const main = async () => {
  await menus.runSetupMenu();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
