import path from "path";
import { ORION_CONFIG_DIR, ORION_ROOT } from "../shared";

export const CONFIG_PATH = path.join(ORION_CONFIG_DIR, "config.json");
export const CONFIG_HASH_PATH = path.join(ORION_CONFIG_DIR, "config.hash");
export const DEFAULT_CONFIG_PATH = path.join(
  ORION_ROOT,
  "infra/edge/src/defaultConfig.json",
);