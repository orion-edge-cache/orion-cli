import { confirm, isCancel, spinner } from "@clack/prompts";
import { destroyInfrastructure } from "@orion/infra";
import {
  promptForDestroyCredentials,
  showErrorMenu,
  showDetailedLogs,
} from "../../ui/prompts";

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
