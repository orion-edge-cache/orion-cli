import { isCancel, select } from "@clack/prompts";
import { displayHeader } from "../ui/display";
import { runCacheTests, runLoadTest } from "../testing";

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

export const handleLoadTest = async () => {
  displayHeader("Load Test");
  await runLoadTest();
  const back = (await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  })) as string;
  if (isCancel(back)) {
    return;
  }
};
