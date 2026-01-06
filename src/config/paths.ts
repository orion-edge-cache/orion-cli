import path from "path";
import { ORION_CONFIG_DIR } from "../shared";
import { DEFAULT_CONFIG_PATH } from "@orion/infra";

export const CONFIG_PATH = path.join(ORION_CONFIG_DIR, "config.json");
export const CONFIG_HASH_PATH = path.join(ORION_CONFIG_DIR, "config.hash");
export { DEFAULT_CONFIG_PATH };