import { execSync } from "child_process";
import type { UnwrappedTerraformOutput } from "../shared";
import { readConfig } from "./file-manager";
import { updateConfigHash } from "./change-detection";

export const deployConfigChanges = (terraformOutput: UnwrappedTerraformOutput) => {
  try {
    const configStore = terraformOutput.configstore;
    const config = JSON.parse(readConfig());
    const configValue = JSON.stringify(config).replace(/'/g, "'\\''");

    execSync(
      `fastly config-store-entry upsert --key=CACHE_CONFIG_JSON --store-id=${configStore.id} --value '${configValue}' --token ${process.env.FASTLY_API_KEY}`,
      {
        stdio: "inherit",
        env: { ...process.env },
      },
    );

    updateConfigHash();
  } catch (error) {
    console.error("Error deploying config changes:", error);
  }
};