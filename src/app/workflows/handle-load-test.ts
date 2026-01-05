import { isCancel, select } from "@clack/prompts";
import { displayHeader } from "../../ui/display";
import { runLoadTest } from "../../testing";

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