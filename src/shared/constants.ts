import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ORION_ROOT = path.join(__dirname, "../../");
export const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");

export const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, "terraform.tfstate");
export const TERRAFORM_DIR = path.join(ORION_ROOT, "infra/iac");