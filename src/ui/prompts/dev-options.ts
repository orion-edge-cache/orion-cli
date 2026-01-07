import { isCancel, select } from "@clack/prompts";
import { displayHeader } from "../display";

export const askDevOptions = async () => {
  displayHeader("Dev Options");
  
  const choice = (await select({
    message: "Select a development option:",
    options: [
      { value: "tail", label: "1. Tail Logs" },
      { value: "build", label: "2. Build Fastly Compute" },
      { value: "deploy", label: "3. Deploy Fastly Compute" },
      { value: "back", label: "4. Back to Main Menu" },
    ],
  })) as string;

  if (isCancel(choice)) {
    return false;
  }

  return choice;
};
