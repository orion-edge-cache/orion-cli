import { spinner, select, isCancel } from "@clack/prompts";
import {
  deployInfrastructure,
  getTerraformOutputs,
  type DeployConfig,
} from "@orion/infra";
import {
  promptForCredentials,
  askForDomain,
  showErrorMenu,
  showDetailedLogs,
} from "../../ui/prompts";
import { displayHeader, displayLogo, displayOutput } from "../../ui/display";
import { handleExistingState } from "./existing-deployment";
import { unwrapTerraformOutput } from "../../shared";

export const handleNewState = async (): Promise<boolean> => {
  // 1. Collect and validate credentials
  const credResult = await promptForCredentials();
  if (!credResult) return false;

  const { config: credConfig, saveCredentials } = credResult;

  // 2. Get backend domain
  const domain = await askForDomain();
  if (!domain) return false;

  // 3. Build complete DeployConfig
  const config: DeployConfig = {
    aws: credConfig.aws,
    fastly: credConfig.fastly,
    backend: {
      graphqlUrl: `${domain.protocol}://${domain.url}:${domain.port}`,
      hostOverride: domain.hostOverride,
    },
    saveCredentials,
  };

  // 4. Deploy with error handling loop
  let deployed = false;
  while (!deployed) {
    const s = spinner();
    try {
      s.start("Deploying infrastructure...");

      await deployInfrastructure(config, (event) => {
        s.message(event.message);
      });

      s.stop("Infrastructure deployed");
      deployed = true;
    } catch (error) {
      s.stop("Deployment failed");

      let inErrorMenu = true;
      while (inErrorMenu) {
        const action = await showErrorMenu(error as Error);

        if (action === "view-logs") {
          const logAction = await showDetailedLogs(error as Error);
          if (logAction === "exit") return false;
          // "back" continues error menu loop
        } else if (action === "retry") {
          inErrorMenu = false; // exit error menu, retry deployment
        } else {
          return false; // exit
        }
      }
    }
  }

  // 5. Get outputs and display
  const rawOutput = getTerraformOutputs();
  const output = unwrapTerraformOutput(rawOutput);

  // 6. Show completion menu
  displayLogo();
  const viewCacheChoice = (await select({
    message: "Deployment complete",
    options: [{ value: "view", label: "View Current Cache" }],
  })) as string;

  if (!isCancel(viewCacheChoice)) {
    displayHeader("Deployed");
    displayOutput(output);

    const back = (await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    })) as string;

    if (!isCancel(back)) {
      return await handleExistingState();
    }
  }

  return true;
};
