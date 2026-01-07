import { log, isCancel, select, confirm } from "@clack/prompts";
import { displayLogo } from "../display";
import { checkTfStateExists } from "@orion/infra";
import { checkDemoAppDeployed } from "@orion/demo-app";

export const askInitialAction = async (): Promise<string | false> => {
  displayLogo();

  const hasTfState = checkTfStateExists();
  const hasDemoApp = checkDemoAppDeployed();
  
  const options = hasTfState
    ? [
        { value: "view", label: "1. View Current Cache" },
        { value: "dev-options", label: "2. Dev Options" },
        { value: "demo-tools", label: "3. Demo Tools" },
        { value: "readme", label: "4. View Usage Guide" },
        { value: "exit", label: "5. Exit" },
      ]
    : [
        { value: "create", label: "1. Create New Edge Cache" },
        { value: "deploy-demo", label: "2. Deploy Demo App", hint: "Get a GraphQL endpoint to test with" },
        { value: "readme", label: "3. View Usage Guide" },
        { value: "exit", label: "4. Exit" },
      ];

  let choice = (await select({
    message: "Welcome to Orion - Edge Cache for GraphQL",
    options,
  })) as string;

  if (isCancel(choice)) {
    choice = "exit";
  }

  return choice;
};