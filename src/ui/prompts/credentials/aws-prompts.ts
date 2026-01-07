import { text, confirm, isCancel, cancel } from "@clack/prompts";
import type { AWSCredentials } from "../../../services/credentials/types.js";

export async function promptForAwsCredentials(): Promise<Omit<AWSCredentials, 'region'> | null> {
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

export async function promptForAwsRegion(defaultRegion: string = "us-east-1"): Promise<string | null> {
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
