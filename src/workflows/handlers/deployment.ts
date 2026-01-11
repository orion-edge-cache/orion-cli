import fs from "fs";
import { spinner, select, isCancel, confirm, log } from "@clack/prompts";
import {
  deployInfrastructure,
  destroyInfrastructure,
  getTerraformOutputs,
  cleanupAfterDestroy,
  resetConfigToDefaults,
  ORION_CONFIG_DIR,
  BACKEND_URL_PATH,
  type DeployConfig,
} from "@orion/infra";
import {
  destroyDemoApp,
  checkDemoAppDeployed,
  type DemoAppConfig,
  type ProgressEvent,
} from "@orion/demo-app";
import {
  promptForCredentials,
  askForDomain,
  showErrorMenu,
  showDetailedLogs,
  promptForDestroyCredentials,
} from "../../ui/prompts";
import { displayHeader, displayLogo, displayOutput } from "../../ui/display";
import {
  unwrapTerraformOutput,
  checkCLIDependencies,
  type CLIDependencyStatus,
} from "../../shared";
import { runCacheMenu } from "../menus/cache-menu";

/**
 * Check CLI dependencies and display results
 * Returns true if all dependencies are installed, false otherwise
 */
async function checkAndDisplayCLIDependencies(): Promise<boolean> {
  const s = spinner();
  s.start("Checking CLI dependencies...");

  const status: CLIDependencyStatus = await checkCLIDependencies();

  if (status.allInstalled) {
    s.stop("CLI dependencies verified");
    return true;
  }

  s.stop("Missing CLI dependencies");

  log.error("The following CLI tools are required but not installed:");
  for (const dep of status.dependencies) {
    if (!dep.installed) {
      log.warn(`  - ${dep.name}: ${dep.error}`);
    }
  }

  log.info("");
  log.info("Please install the missing tools:");
  log.info("  - Fastly CLI: https://developer.fastly.com/reference/cli/");
  log.info("  - Terraform: https://developer.hashicorp.com/terraform/install");

  return false;
}

export const handleCreateDeployment = async (): Promise<boolean> => {
  // 0. Check CLI dependencies first
  const depsOk = await checkAndDisplayCLIDependencies();
  if (!depsOk) return false;

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

      // Reset config.json to defaults for fresh deployment
      resetConfigToDefaults();
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
  let s: ReturnType<typeof spinner> | undefined;
  const rawOutput = await getTerraformOutputs(() => {
    s = spinner();
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
      return await runCacheMenu();
    }
  }

  return true;
};

export const handleDestroyDeployment = async (): Promise<boolean> => {
  // Check CLI dependencies first
  const depsOk = await checkAndDisplayCLIDependencies();
  if (!depsOk) return false;

  // Check if demo app is also deployed
  const hasDemoApp = checkDemoAppDeployed();

  const confirmMessage = hasDemoApp
    ? "Confirm destroy infrastructure? (This will also destroy the demo app)"
    : "Confirm destroy infrastructure?";

  const confirmDestroy = await confirm({
    message: confirmMessage,
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
      // Destroy demo app first if it exists
      if (hasDemoApp) {
        s.start("Destroying demo app...");
        
        const demoAppConfig: DemoAppConfig = {
          aws: {
            accessKeyId: destroyConfig.awsAccessKeyId,
            secretAccessKey: destroyConfig.awsSecretAccessKey,
            region: destroyConfig.awsRegion,
          },
        };
        
        await destroyDemoApp(demoAppConfig, (event: ProgressEvent) => {
          s.message(`Demo app: ${event.message}`);
        });
        
        s.stop("Demo app destroyed");
      }

      s.start("Destroying infrastructure...");

      await destroyInfrastructure(destroyConfig, (event) => {
        s.message(event.message);
      });

      s.stop("Infrastructure destroyed");
      destroyed = true;

      // Clean up config directory (preserves deployment-config.json)
      await cleanupAfterDestroy();
      log.info("Cleaned up ~/.config/orion");
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
