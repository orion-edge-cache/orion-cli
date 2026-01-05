import path from "path";
import os from "os";
import { join } from "path";

export const ORION_ROOT = join(__dirname, "../../");
export const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");

export const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, "terraform.tfstate");
export const TERRAFORM_DIR = join(ORION_ROOT, "infra/iac");