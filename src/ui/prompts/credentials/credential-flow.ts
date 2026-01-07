import { confirm, isCancel, cancel, log } from "@clack/prompts";
import type { DeployConfig, DestroyConfig } from "@orion/infra";
import {
  detectAvailableSources,
  getEnvCredentials,
  validateAllCredentials,
  saveCredentials,
  type AWSCredentials,
  type FastlyCredentials,
} from "../../../services/credentials/index.js";
import { promptForAwsCredentials, promptForAwsRegion } from "./aws-prompts.js";
import { promptForFastlyCredentials } from "./fastly-prompts.js";
import { promptForCredentialSource, type CredentialSource } from "./source-selector.js";

interface CredentialFlowOptions {
  purpose: "deploy" | "destroy";
}

async function promptForSaveCredentials(): Promise<boolean | null> {
  const save = await confirm({
    message: "Save credentials for future use?",
    initialValue: true,
  });

  if (isCancel(save)) {
    cancel("Operation cancelled.");
    return null;
  }

  return save as boolean;
}

async function collectCredentials(
  source: CredentialSource,
  sources: Awaited<ReturnType<typeof detectAvailableSources>>
): Promise<{ aws: AWSCredentials; fastly: FastlyCredentials; shouldSave: boolean } | null> {
  let aws: AWSCredentials;
  let fastly: FastlyCredentials;
  let shouldSave = false;

  if (source === "saved") {
    const saved = sources.saved.data!;
    aws = saved.aws!;
    fastly = saved.fastly!;
  } else if (source === "env") {
    const envCreds = getEnvCredentials();
    aws = envCreds.aws!;
    fastly = envCreds.fastly!;
  } else {
    // Manual entry
    const awsCreds = await promptForAwsCredentials();
    if (!awsCreds) return null;

    const fastlyCreds = await promptForFastlyCredentials();
    if (!fastlyCreds) return null;

    const region = await promptForAwsRegion();
    if (!region) return null;

    aws = { ...awsCreds, region };
    fastly = fastlyCreds;

    const saveChoice = await promptForSaveCredentials();
    if (saveChoice === null) return null;
    shouldSave = saveChoice;
  }

  return { aws, fastly, shouldSave };
}

export async function promptForCredentials(): Promise<{
  config: DeployConfig;
  saveCredentials: boolean;
} | null> {
  while (true) {
    const sources = await detectAvailableSources();

    const selection = await promptForCredentialSource(sources, "deploy");
    if (!selection) return null;

    const credentials = await collectCredentials(selection.source, sources);
    if (!credentials) return null;

    const validation = await validateAllCredentials(credentials.aws, credentials.fastly);

    if (!validation.aws || !validation.fastly) {
      log.error("Credential validation failed:");
      validation.errors.forEach((err) => log.error(`  - ${err}`));
      log.info("Returning to credential selection...\n");
      continue;
    }

    if (credentials.shouldSave) {
      await saveCredentials(credentials.aws, credentials.fastly);
    }

    const config: DeployConfig = {
      aws: {
        accessKeyId: credentials.aws.accessKeyId,
        secretAccessKey: credentials.aws.secretAccessKey,
        region: credentials.aws.region,
        useEnv: selection.source === "env",
      },
      fastly: {
        apiToken: credentials.fastly.apiToken,
        useEnv: selection.source === "env",
      },
      backend: {
        graphqlUrl: "", // Will be filled in by workflow
      },
    };

    return { config, saveCredentials: credentials.shouldSave };
  }
}

export async function promptForDestroyCredentials(): Promise<DestroyConfig | null> {
  while (true) {
    const sources = await detectAvailableSources();

    const selection = await promptForCredentialSource(sources, "destroy");
    if (!selection) return null;

    const credentials = await collectCredentials(selection.source, sources);
    if (!credentials) return null;

    const validation = await validateAllCredentials(credentials.aws, credentials.fastly);

    if (!validation.aws || !validation.fastly) {
      log.error("Credential validation failed:");
      validation.errors.forEach((err) => log.error(`  - ${err}`));
      log.info("Returning to credential selection...\n");
      continue;
    }

    return {
      awsAccessKeyId: credentials.aws.accessKeyId,
      awsSecretAccessKey: credentials.aws.secretAccessKey,
      awsRegion: credentials.aws.region,
      fastlyApiToken: credentials.fastly.apiToken,
    };
  }
}
