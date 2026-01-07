import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { spinner } from "@clack/prompts";
import type { AWSCredentials, FastlyCredentials, ValidationResult, FullValidationResult } from "./types.js";

export async function validateAwsCredentials(creds: AWSCredentials): Promise<ValidationResult> {
  try {
    const stsClient = new STSClient({
      region: creds.region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
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

export async function validateFastlyCredentials(creds: FastlyCredentials): Promise<ValidationResult> {
  try {
    const response = await fetch("https://api.fastly.com/current_user", {
      headers: { "Fastly-Key": creds.apiToken },
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

export async function validateAllCredentials(
  aws: AWSCredentials,
  fastly: FastlyCredentials
): Promise<FullValidationResult> {
  const errors: string[] = [];
  let awsValid = false;
  let fastlyValid = false;

  const s = spinner();

  s.start("Validating AWS credentials...");
  const awsResult = await validateAwsCredentials(aws);
  if (awsResult.valid) {
    s.stop("AWS credentials valid");
    awsValid = true;
  } else {
    s.stop("AWS credentials invalid");
    errors.push(`AWS: ${awsResult.error}`);
  }

  s.start("Validating Fastly credentials...");
  const fastlyResult = await validateFastlyCredentials(fastly);
  if (fastlyResult.valid) {
    s.stop("Fastly credentials valid");
    fastlyValid = true;
  } else {
    s.stop("Fastly credentials invalid");
    errors.push(`Fastly: ${fastlyResult.error}`);
  }

  return { aws: awsValid, fastly: fastlyValid, errors };
}
