import { select, isCancel, cancel, log } from "@clack/prompts";
import type { CredentialSources } from "../../../services/credentials/types.js";

export type CredentialSource = "saved" | "env" | "manual";

export interface SourceSelectionResult {
  source: CredentialSource;
}

export async function promptForCredentialSource(
  sources: CredentialSources,
  purpose: "deploy" | "destroy"
): Promise<SourceSelectionResult | null> {
  const options: { value: CredentialSource; label: string; hint?: string }[] = [];

  if (sources.saved.complete) {
    options.push({
      value: "saved",
      label: "Use saved credentials",
      hint: "~/.config/orion/deployment-config.json",
    });
  }

  if (sources.env.complete) {
    options.push({
      value: "env",
      label: "Use environment variables",
    });
  }

  options.push({
    value: "manual",
    label: "Enter credentials manually",
  });

  // If only manual option, skip menu
  if (options.length === 1) {
    log.info("No saved or environment credentials found. Please enter credentials.");
    return { source: "manual" };
  }

  const message = purpose === "destroy"
    ? "How would you like to provide credentials for destroy?"
    : "How would you like to provide credentials?";

  const choice = await select({ message, options });

  if (isCancel(choice)) {
    cancel("Operation cancelled.");
    return null;
  }

  return { source: choice as CredentialSource };
}
