import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { loadEnvFromFile, normalizeFastlyKeys } from "../../config/credentials-validator.js";
import type { SavedCredentials, CredentialSources, AWSCredentials, FastlyCredentials } from "./types.js";

const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");
const DEPLOYMENT_CONFIG_PATH = path.join(ORION_CONFIG_DIR, "deployment-config.json");

export async function getSavedCredentials(): Promise<SavedCredentials | null> {
  try {
    if (!existsSync(DEPLOYMENT_CONFIG_PATH)) return null;
    const content = await readFile(DEPLOYMENT_CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function getEnvCredentials(): {
  aws: AWSCredentials | null;
  fastly: FastlyCredentials | null;
} {
  loadEnvFromFile();
  normalizeFastlyKeys();

  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const fastlyToken = process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;

  return {
    aws: awsAccessKeyId && awsSecretAccessKey
      ? { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey, region: awsRegion }
      : null,
    fastly: fastlyToken ? { apiToken: fastlyToken } : null,
  };
}

export async function detectAvailableSources(): Promise<CredentialSources> {
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
