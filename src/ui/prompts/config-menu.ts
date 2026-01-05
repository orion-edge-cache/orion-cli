import { isCancel, select } from "@clack/prompts";
import { displayHeader } from "../display";

export const askConfigMenu = async () => {
  displayHeader("Config");
  const choice = (await select({
    message: "Config Menu. What would you like to do?",
    options: [
      { value: "view", label: "1. View Config" },
      { value: "edit", label: "2. Edit Config" },
      { value: "deploy", label: "3. Deploy Changes" },
      { value: "back", label: "4. Back" },
    ],
  })) as string;

  if (isCancel(choice)) {
    return false;
  }

  return choice;
};