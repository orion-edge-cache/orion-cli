import { execSync } from "child_process";
import { CONFIG_PATH } from "./paths";

export const editConfigInEditor = async () => {
  const editor = process.env.EDITOR || "nano";
  try {
    execSync(`${editor} ${CONFIG_PATH}`, {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Error opening config file in editor:", error);
  }
};