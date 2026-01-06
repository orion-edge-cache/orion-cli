import fs from "fs";
import { spinner, select, isCancel, outro, confirm, log } from "@clack/prompts";
import {
  deployInfrastructure,
  destroyInfrastructure,
  getTerraformOutputs,
  ORION_CONFIG_DIR,
  BACKEND_URL_PATH,
  type DeployConfig,
} from "@orion/infra";
import {
  promptForCredentials,
  askForDomain,
  showErrorMenu,
  showDetailedLogs,
  askExistingState,
  promptForDestroyCredentials,
} from "../ui/prompts";
import { displayHeader, displayLogo, displayOutput } from "../ui/display";
import { unwrapTerraformOutput } from "../shared";
import { ensureConfigExists } from "../config";

// Internal imports from same file
import { handleCachePurge } from "./cache";
import { handleComputeBuild, handleComputeDeploy } from "./compute";
import { handleConfigManagement } from "./config";
import { handleViewDetails, handleKinesisTail } from "./monitoring";
import { handleCacheTests, handleLoadTest } from "./testing";

export const handleNewDeployment = async (): Promise<boolean> => {
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

      // Save backend URL for console compatibility
      fs.mkdirSync(ORION_CONFIG_DIR, { recursive: true });
      fs.writeFileSync(BACKEND_URL_PATH, config.backend.graphqlUrl);

      // Ensure config.json exists with defaults
      ensureConfigExists();
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
  let s = spinner();
  const rawOutput = getTerraformOutputs(() => {
    s.start("Initializing Terraform...");
  });
  if (s) {
    s.stop("Terraform initialized");
  }
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
      return await handleExistingDeployment();
    }
  }

  return true;
};

export const handleExistingDeployment = async (): Promise<boolean> => {
  let continueLoop = true;
  while (continueLoop) {
    const choice = await askExistingState();
    if (!choice) break;

    if (choice === "destroy") {
      continueLoop = await handleDestroy();
      continue;
    }

    if (choice === "view") {
      await handleViewDetails();
      continue;
    }

    if (choice === "tail") {
      await handleKinesisTail();
      continueLoop = true;
      continue;
    }

    if (choice === "build") {
      handleComputeBuild();
      continue;
    }

    if (choice === "deploy") {
      handleComputeDeploy();
      continue;
    }

    if (choice === "purge") {
      await handleCachePurge();
      continue;
    }

    if (choice === "test") {
      await handleCacheTests();
      continue;
    }

    if (choice === "load-test") {
      await handleLoadTest();
      continue;
    }

    if (choice === "config") {
      await handleConfigManagement();
      continue;
    }

    if (choice === "back") {
      continueLoop = false;
    }

    if (choice === "exit") {
      outro("Goodbye!");
      process.exit(0);
    }
  }
  return true;
};

export const handleDestroy = async (): Promise<boolean> => {
  const confirmDestroy = await confirm({
    message: "Confirm destroy infrastructure?",
  });

  if (isCancel(confirmDestroy) || !confirmDestroy) {
    return true;
  }

  // Get destroy credentials
  const destroyConfig = await promptForDestroyCredentials();
  if (!destroyConfig) return true;

  // Destroy with error handling loop
  let destroyed = false;
  while (!destroyed) {
    const s = spinner();
    try {
      s.start("Destroying infrastructure...");

      await destroyInfrastructure(destroyConfig, (event) => {
        s.message(event.message);
      });

      s.stop("Infrastructure destroyed");
      destroyed = true;

      // Clean up config directory
      if (fs.existsSync(ORION_CONFIG_DIR)) {
        fs.rmSync(ORION_CONFIG_DIR, { recursive: true, force: true });
        log.info("Cleaned up ~/.config/orion");
      }
    } catch (error) {
      s.stop("Destroy failed");

      let inErrorMenu = true;
      while (inErrorMenu) {
        const action = await showErrorMenu(error as Error);

        if (action === "view-logs") {
          const logAction = await showDetailedLogs(error as Error);
          if (logAction === "exit") return false;
        } else if (action === "retry") {
          inErrorMenu = false;
        } else {
          return false;
        }
      }
    }
  }

  return false; // Return to initial menu after destroy
};
