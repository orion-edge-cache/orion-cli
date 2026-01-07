import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import { log } from "@clack/prompts";
import type { AWSCredentials, FastlyCredentials, SavedCredentials } from "./types.js";

const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");
const DEPLOYMENT_CONFIG_PATH = path.join(ORION_CONFIG_DIR, "deployment-config.json");

export async function saveCredentials(
  aws: AWSCredentials,
  fastly: FastlyCredentials
): Promise<void> {
  const credentials: SavedCredentials = {
    aws,
    fastly,
    savedAt: new Date().toISOString(),
  };

  await mkdir(ORION_CONFIG_DIR, { recursive: true });
  await writeFile(DEPLOYMENT_CONFIG_PATH, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
  log.success("Credentials saved to ~/.config/orion/deployment-config.json");
}

export { ORION_CONFIG_DIR, DEPLOYMENT_CONFIG_PATH };
