import { confirm, select, isCancel, note, log } from "@clack/prompts";
import { writeConfig } from "../../../../config/index.js";
import type { OrionCacheConfig } from "@orion/schema";

export async function presentAndSaveConfig(
  config: OrionCacheConfig,
  description: string
): Promise<void> {
  const configJson = JSON.stringify(config, null, 2);

  console.log("\n");
  note(configJson, description);

  const saveConfigChoice = await confirm({
    message: "Save this configuration?",
    initialValue: true,
  });

  if (isCancel(saveConfigChoice)) return;

  if (saveConfigChoice) {
    writeConfig(configJson);
    log.success("Configuration saved to ~/.config/orion/config.json");

    const deployNow = await confirm({
      message: "Deploy the configuration now?",
      initialValue: false,
    });

    if (!isCancel(deployNow) && deployNow) {
      const { handleDeployConfig } = await import("../../config.js");
      await handleDeployConfig();
      return;
    }
  }

  await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  });
}
