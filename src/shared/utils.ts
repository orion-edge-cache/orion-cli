import fs from "fs";
import { ORION_CONFIG_DIR } from "./constants";

export const ensureOrionConfigDir = () => {
  if (!fs.existsSync(ORION_CONFIG_DIR)) {
    fs.mkdirSync(ORION_CONFIG_DIR, { recursive: true });
  }
};