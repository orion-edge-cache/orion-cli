import { log, isCancel, select, confirm } from "@clack/prompts";
import { displayLogo } from "../display";
import { checkTfStateExists } from "@orion/infra";

export const askInitialAction = async (): Promise<string | false> => {
  displayLogo();

  const hasTfState = checkTfStateExists();
  const options = [
    { value: "create", label: "1. Create New Edge Cache" },
    ...(hasTfState ? [{ value: "view", label: "2. View Current Cache" }] : []),
    {
      value: "readme",
      label: hasTfState ? "3. View Usage Guide" : "2. View Usage Guide",
    },
    { value: "exit", label: hasTfState ? "4. Exit" : "3. Exit" },
  ];

  let choice = (await select({
    message: "Welcome to Orion - Edge Cache for GraphQL",
    options,
  })) as string;

  if (isCancel(choice)) {
    choice = "exit";
  }

  if (choice === "create" && hasTfState) {
    log.warn(
      "⚠️  Creating a new edge cache will DESTROY your current infrastructure and build a new one!",
    );
    const confirmed = (await confirm({
      message: "Do you want to proceed?",
    })) as boolean;

    if (isCancel(confirmed) || !confirmed) {
      return await askInitialAction();
    }
  }

  return choice;
};