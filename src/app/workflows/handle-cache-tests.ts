import { isCancel, select } from "@clack/prompts";
import { displayHeader } from "../../ui/display";
import { runCacheTests } from "../../testing";

export const handleCacheTests = async () => {
  displayHeader("Cache Tests");
  await runCacheTests();
  const back = (await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  })) as string;
  if (isCancel(back)) {
    return;
  }
};