import { cancel, isCancel, select } from "@clack/prompts";

export const askReadmeAction = async (): Promise<string | false> => {
  const choice = (await select({
    message: "Usage Guide",
    options: [
      { value: "back", label: "1. Back to Main" },
      { value: "exit", label: "2. Exit" },
    ],
  })) as string;

  if (isCancel(choice)) {
    cancel("Operation cancelled.");
    return false;
  }

  return choice;
};