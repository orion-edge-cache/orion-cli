import fs from "fs";
import crypto from "crypto";
import { CONFIG_HASH_PATH, CONFIG_PATH } from "./paths";

const calculateConfigHash = (): string => {
  const config = fs.readFileSync(CONFIG_PATH, "utf-8");
  return crypto.createHash("sha256").update(config).digest("hex");
};

export const updateConfigHash = () => {
  const hash = calculateConfigHash();
  fs.writeFileSync(CONFIG_HASH_PATH, hash);
};

export const hasConfigChanged = (): boolean => {
  if (!fs.existsSync(CONFIG_HASH_PATH)) {
    return true;
  }

  const currentHash = calculateConfigHash();
  const savedHash = fs.readFileSync(CONFIG_HASH_PATH, "utf-8");
  return currentHash !== savedHash;
};