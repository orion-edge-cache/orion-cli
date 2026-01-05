import { log, text } from "@clack/prompts";
import {
  loadEnvFromFile,
  normalizeFastlyKeys,
  getCredentialStatus,
} from "../../config/credentials-validator";

export const ensureApiKeys = async () => {
  loadEnvFromFile();
  normalizeFastlyKeys();

  const { hasAws, hasFastly } = getCredentialStatus();

  if (!hasAws || !hasFastly) {
    if (!process.env.FASTLY_API_KEY) {
      log.warn("Fastly credentials not set");
      process.env.FASTLY_API_KEY = (await text({
        message: "What is your Fastly API Key:",
      })) as string;
      process.env.FASTLY_API_TOKEN = process.env.FASTLY_API_KEY;
    }
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      log.warn("AWS credentials not set");
      process.env.AWS_SECRET_ACCESS_KEY = (await text({
        message: "What is your AWS Secret Access Key:",
      })) as string;
      process.env.AWS_ACCESS_KEY_ID = (await text({
        message: "What is your AWS Access Key ID:",
      })) as string;
    }
  }

  return { aws: hasAws, fastly: hasFastly };
};