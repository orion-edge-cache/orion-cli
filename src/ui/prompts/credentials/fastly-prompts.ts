import { text, isCancel, cancel } from "@clack/prompts";
import type { FastlyCredentials } from "../../../services/credentials/types.js";

export async function promptForFastlyCredentials(): Promise<FastlyCredentials | null> {
  const apiToken = await text({
    message: "Fastly API Token:",
    validate(value) {
      if (!value.trim()) return "API Token is required";
    },
  });

  if (isCancel(apiToken)) {
    cancel("Operation cancelled.");
    return null;
  }

  return { apiToken: apiToken as string };
}
