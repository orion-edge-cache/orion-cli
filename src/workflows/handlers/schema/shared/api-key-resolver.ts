import { confirm, password, isCancel, log, note } from "@clack/prompts";
import {
  getAIKeyFromCredentials,
  getAIKeyFromEnv,
  saveAIKeyToCredentials,
  validateAPIKey,
  maskAPIKey,
  getEnvVarNames,
  PROVIDER_INFO,
  type AIProvider,
} from "@orion/schema";

export interface APIKeyResult {
  key: string;
  source: "credentials" | "env" | "user";
}

export async function resolveAPIKey(provider: AIProvider): Promise<APIKeyResult | null> {
  const providerInfo = PROVIDER_INFO[provider];

  // Show provider info
  console.log("\n");
  note(
    `${providerInfo.description}\n\nModels: ${providerInfo.models.join(", ")}\nPricing: ${providerInfo.pricing}\nSetup: ${providerInfo.setupUrl}`,
    providerInfo.name
  );

  // Check credentials.json first
  let apiKey = await getAIKeyFromCredentials(provider);
  if (apiKey) {
    log.info(`Using saved API key: ${maskAPIKey(apiKey)}`);

    const useExisting = await confirm({
      message: "Use this saved API key?",
      initialValue: true,
    });

    if (isCancel(useExisting)) return null;

    if (useExisting) {
      return { key: apiKey, source: "credentials" };
    }
    apiKey = null;
  }

  // Check environment variables
  if (!apiKey) {
    apiKey = getAIKeyFromEnv(provider);
    if (apiKey) {
      const envVars = getEnvVarNames(provider);
      log.info(`Using API key from environment variable: ${envVars[0]}`);

      const useEnv = await confirm({
        message: "Use this environment variable?",
        initialValue: true,
      });

      if (isCancel(useEnv)) return null;

      if (useEnv) {
        return { key: apiKey, source: "env" };
      }
      apiKey = null;
    }
  }

  // Prompt for API key
  const apiKeyInput = await password({
    message: `Enter your ${providerInfo.name} API key:`,
    validate: (value) => {
      if (!value) return "API key is required";
      const validation = validateAPIKey(provider, value);
      if (!validation.valid) return validation.error;
    },
  });

  if (isCancel(apiKeyInput)) return null;
  apiKey = apiKeyInput as string;

  // Offer to save the key
  const saveKey = await confirm({
    message: "Save this API key to ~/.config/orion/deployment-config.json?",
    initialValue: true,
  });

  if (!isCancel(saveKey) && saveKey) {
    await saveAIKeyToCredentials(provider, apiKey);
    log.success("API key saved securely (file permissions: 0600)");
  }

  return { key: apiKey, source: "user" };
}
