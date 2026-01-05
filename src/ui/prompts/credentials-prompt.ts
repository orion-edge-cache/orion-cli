import {
  select,
  text,
  confirm,
  spinner,
  isCancel,
  cancel,
  log,
} from "@clack/prompts";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import type { DeployConfig, DestroyConfig } from "@orion/infra";
import {
  loadEnvFromFile,
  normalizeFastlyKeys,
} from "../../config/credentials-validator";

const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");
const CREDENTIALS_PATH = path.join(ORION_CONFIG_DIR, "credentials.json");

interface SavedCredentials {
  aws?: { accessKeyId: string; secretAccessKey: string; region: string };
  fastly?: { apiToken: string };
  savedAt: string;
}

interface CredentialSources {
  saved: {
    available: boolean;
    complete: boolean;
    hasAws: boolean;
    hasFastly: boolean;
    data: SavedCredentials | null;
  };
  env: {
    available: boolean;
    complete: boolean;
    hasAws: boolean;
    hasFastly: boolean;
  };
}

// ============ Detection Functions ============

async function getSavedCredentials(): Promise<SavedCredentials | null> {
  try {
    if (!existsSync(CREDENTIALS_PATH)) return null;
    const content = await readFile(CREDENTIALS_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getEnvCredentials(): {
  aws: { accessKeyId: string; secretAccessKey: string; region: string } | null;
  fastly: { apiToken: string } | null;
} {
  // Load from .env file if present
  loadEnvFromFile();
  normalizeFastlyKeys();

  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const fastlyToken =
    process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;

  return {
    aws:
      awsAccessKeyId && awsSecretAccessKey
        ? { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey, region: awsRegion }
        : null,
    fastly: fastlyToken ? { apiToken: fastlyToken } : null,
  };
}

async function detectAvailableSources(): Promise<CredentialSources> {
  const saved = await getSavedCredentials();
  const env = getEnvCredentials();

  return {
    saved: {
      available: saved !== null,
      complete: !!(saved?.aws && saved?.fastly),
      hasAws: !!saved?.aws,
      hasFastly: !!saved?.fastly,
      data: saved,
    },
    env: {
      available: !!(env.aws || env.fastly),
      complete: !!(env.aws && env.fastly),
      hasAws: !!env.aws,
      hasFastly: !!env.fastly,
    },
  };
}

// ============ Validation Functions ============

async function validateAwsCredentials(
  accessKeyId: string,
  secretAccessKey: string,
  region: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const stsClient = new STSClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    await stsClient.send(new GetCallerIdentityCommand({}));
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid credentials",
    };
  }
}

async function validateFastlyCredentials(
  apiToken: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.fastly.com/current_user", {
      headers: { "Fastly-Key": apiToken },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return { valid: true };
    }
    return { valid: false, error: `API returned ${response.status}` };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function validateAllCredentials(
  aws: { accessKeyId: string; secretAccessKey: string; region: string },
  fastly: { apiToken: string }
): Promise<{ aws: boolean; fastly: boolean; errors: string[] }> {
  const errors: string[] = [];
  let awsValid = false;
  let fastlyValid = false;

  const s = spinner();

  s.start("Validating AWS credentials...");
  const awsResult = await validateAwsCredentials(
    aws.accessKeyId,
    aws.secretAccessKey,
    aws.region
  );
  if (awsResult.valid) {
    s.stop("AWS credentials valid");
    awsValid = true;
  } else {
    s.stop("AWS credentials invalid");
    errors.push(`AWS: ${awsResult.error}`);
  }

  s.start("Validating Fastly credentials...");
  const fastlyResult = await validateFastlyCredentials(fastly.apiToken);
  if (fastlyResult.valid) {
    s.stop("Fastly credentials valid");
    fastlyValid = true;
  } else {
    s.stop("Fastly credentials invalid");
    errors.push(`Fastly: ${fastlyResult.error}`);
  }

  return { aws: awsValid, fastly: fastlyValid, errors };
}

// ============ Prompt Functions ============

async function promptForAwsCredentials(): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
} | null> {
  const accessKeyId = await text({
    message: "AWS Access Key ID:",
    validate(value) {
      if (!value.trim()) return "Access Key ID is required";
    },
  });

  if (isCancel(accessKeyId)) {
    cancel("Operation cancelled.");
    return null;
  }

  const secretAccessKey = await text({
    message: "AWS Secret Access Key:",
    validate(value) {
      if (!value.trim()) return "Secret Access Key is required";
    },
  });

  if (isCancel(secretAccessKey)) {
    cancel("Operation cancelled.");
    return null;
  }

  return {
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
  };
}

async function promptForFastlyCredentials(): Promise<{
  apiToken: string;
} | null> {
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

async function promptForAwsRegion(defaultRegion: string = "us-east-1"): Promise<string | null> {
  const useDefault = await confirm({
    message: `Use default AWS region (${defaultRegion})?`,
    initialValue: true,
  });

  if (isCancel(useDefault)) {
    cancel("Operation cancelled.");
    return null;
  }

  if (useDefault) {
    return defaultRegion;
  }

  const region = await text({
    message: "AWS Region:",
    placeholder: "us-west-2",
    validate(value) {
      if (!value.trim()) return "Region is required";
    },
  });

  if (isCancel(region)) {
    cancel("Operation cancelled.");
    return null;
  }

  return region as string;
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

async function saveCredentials(
  aws: { accessKeyId: string; secretAccessKey: string; region: string },
  fastly: { apiToken: string }
): Promise<void> {
  const credentials: SavedCredentials = {
    aws,
    fastly,
    savedAt: new Date().toISOString(),
  };

  await mkdir(ORION_CONFIG_DIR, { recursive: true });
  await writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
  log.success("Credentials saved to ~/.config/orion/credentials.json");
}

// ============ Main Export Functions ============

export async function promptForCredentials(): Promise<{
  config: DeployConfig;
  saveCredentials: boolean;
} | null> {
  while (true) {
    const sources = await detectAvailableSources();

    // Build menu options based on available sources
    const options: { value: string; label: string; hint?: string }[] = [];

    if (sources.saved.complete) {
      options.push({
        value: "saved",
        label: "Use saved credentials",
        hint: "~/.config/orion/credentials.json",
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

    let selectedSource: string;

    // If only manual option, skip menu
    if (options.length === 1) {
      selectedSource = "manual";
      log.info("No saved or environment credentials found. Please enter credentials.");
    } else {
      const choice = await select({
        message: "How would you like to provide credentials?",
        options,
      });

      if (isCancel(choice)) {
        cancel("Operation cancelled.");
        return null;
      }

      selectedSource = choice as string;
    }

    // Collect credentials based on selection
    let aws: { accessKeyId: string; secretAccessKey: string; region: string };
    let fastly: { apiToken: string };
    let shouldSave = false;

    if (selectedSource === "saved") {
      const saved = sources.saved.data!;
      aws = saved.aws!;
      fastly = saved.fastly!;
    } else if (selectedSource === "env") {
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

      // Ask to save manually entered credentials
      const saveChoice = await promptForSaveCredentials();
      if (saveChoice === null) return null;
      shouldSave = saveChoice;
    }

    // Validate credentials
    const validation = await validateAllCredentials(aws, fastly);

    if (!validation.aws || !validation.fastly) {
      log.error("Credential validation failed:");
      validation.errors.forEach((err) => log.error(`  - ${err}`));
      log.info("Returning to credential selection...\n");
      continue; // Loop back to source selection
    }

    // Save credentials if requested
    if (shouldSave) {
      await saveCredentials(aws, fastly);
    }

    // Build and return DeployConfig
    const config: DeployConfig = {
      aws: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
        region: aws.region,
        useEnv: selectedSource === "env",
      },
      fastly: {
        apiToken: fastly.apiToken,
        useEnv: selectedSource === "env",
      },
      backend: {
        graphqlUrl: "", // Will be filled in by workflow
      },
    };

    return { config, saveCredentials: shouldSave };
  }
}

export async function promptForDestroyCredentials(): Promise<DestroyConfig | null> {
  while (true) {
    const sources = await detectAvailableSources();

    // Build menu options based on available sources
    const options: { value: string; label: string; hint?: string }[] = [];

    if (sources.saved.complete) {
      options.push({
        value: "saved",
        label: "Use saved credentials",
        hint: "~/.config/orion/credentials.json",
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

    let selectedSource: string;

    // If only manual option, skip menu
    if (options.length === 1) {
      selectedSource = "manual";
      log.info("No saved or environment credentials found. Please enter credentials.");
    } else {
      const choice = await select({
        message: "How would you like to provide credentials for destroy?",
        options,
      });

      if (isCancel(choice)) {
        cancel("Operation cancelled.");
        return null;
      }

      selectedSource = choice as string;
    }

    // Collect credentials based on selection
    let aws: { accessKeyId: string; secretAccessKey: string; region: string };
    let fastly: { apiToken: string };

    if (selectedSource === "saved") {
      const saved = sources.saved.data!;
      aws = saved.aws!;
      fastly = saved.fastly!;
    } else if (selectedSource === "env") {
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
    }

    // Validate credentials
    const validation = await validateAllCredentials(aws, fastly);

    if (!validation.aws || !validation.fastly) {
      log.error("Credential validation failed:");
      validation.errors.forEach((err) => log.error(`  - ${err}`));
      log.info("Returning to credential selection...\n");
      continue; // Loop back to source selection
    }

    // Build and return DestroyConfig
    return {
      awsAccessKeyId: aws.accessKeyId,
      awsSecretAccessKey: aws.secretAccessKey,
      awsRegion: aws.region,
      fastlyApiToken: fastly.apiToken,
    };
  }
}
