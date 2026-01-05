import fs from "fs";
import { ORION_CONFIG_DIR } from "../shared";
import { DEFAULT_CONFIG_PATH, CONFIG_PATH } from "./paths";
import { updateConfigHash } from "./change-detection";

export const ensureConfigExists = () => {
  if (!fs.existsSync(ORION_CONFIG_DIR)) {
    fs.mkdirSync(ORION_CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
    fs.writeFileSync(CONFIG_PATH, defaultConfig);
    updateConfigHash();
  }
};

export const readConfig = (): string => {
  return fs.readFileSync(CONFIG_PATH, "utf-8");
};

export const writeConfig = (content: string) => {
  fs.writeFileSync(CONFIG_PATH, content);
};