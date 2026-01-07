import { select, isCancel, confirm, spinner, note, log } from "@clack/prompts";
import {
  getSupportedProviders,
  getDefaultModel,
  generateCacheConfig,
  generateBasicConfig,
  PROVIDER_INFO,
  type AIProvider,
  type AIProviderConfig,
} from "@orion/schema";
import { displayHeader } from "../../../ui/display/index.js";
import { promptForGraphQLEndpoint } from "./shared/endpoint-prompt.js";
import { fetchSchemaOnly } from "./shared/schema-operations.js";
import { resolveAPIKey } from "./shared/api-key-resolver.js";
import { promptForAIPreferences } from "./shared/preferences-prompt.js";
import { presentAndSaveConfig } from "./shared/config-presenter.js";

async function promptForProvider(): Promise<AIProvider | null> {
  const providers = getSupportedProviders();
  const providerOptions = providers.map((p) => {
    const info = PROVIDER_INFO[p];
    return {
      value: p,
      label: info.name,
      hint: info.pricing,
    };
  });

  const providerChoice = await select({
    message: "Select AI provider:",
    options: providerOptions,
  });

  if (isCancel(providerChoice)) return null;

  return providerChoice as AIProvider;
}

async function promptForModel(provider: AIProvider): Promise<string | undefined | null> {
  const providerInfo = PROVIDER_INFO[provider];
  const defaultModel = getDefaultModel(provider);

  const useDefaultModel = await confirm({
    message: `Use default model (${defaultModel})?`,
    initialValue: true,
  });

  if (isCancel(useDefaultModel)) return null;

  if (useDefaultModel) {
    return undefined; // Use default
  }

  const modelChoice = await select({
    message: "Select model:",
    options: providerInfo.models.map((m) => {
      const isDefault = m === defaultModel;
      return {
        value: m,
        label: m,
        ...(isDefault && { hint: "default" }),
      };
    }),
  });

  if (isCancel(modelChoice)) return null;
  return modelChoice as string;
}

export async function handleAIConfigGeneration(): Promise<void> {
  displayHeader("Schema > Generate Config with AI");

  // 1. Get endpoint
  const endpoint = await promptForGraphQLEndpoint();
  if (!endpoint) return;

  // 2. Select provider
  const provider = await promptForProvider();
  if (!provider) return;

  // 3. Resolve API key
  const apiKeyResult = await resolveAPIKey(provider);
  if (!apiKeyResult) return;

  // 4. Select model
  const model = await promptForModel(provider);
  if (model === null) return;

  // 5. Get preferences
  const preferences = await promptForAIPreferences();
  if (!preferences) return;

  // 6. Fetch and analyze schema
  const analyzedSchema = await fetchSchemaOnly(endpoint);
  if (!analyzedSchema) return;

  // 7. Generate config
  const s = spinner();
  s.start(`Generating config with ${PROVIDER_INFO[provider].name}...`);

  const aiConfig: AIProviderConfig = {
    provider,
    apiKey: apiKeyResult.key,
    ...(model && { model }),
  };

  const configResult = await generateCacheConfig({
    schema: analyzedSchema,
    aiConfig,
    preferences,
  });

  if (!configResult.success || !configResult.config) {
    s.stop("Config generation failed");
    log.error(`Failed to generate config: ${configResult.error}`);

    const useFallback = await confirm({
      message: "Would you like to generate a basic config without AI instead?",
      initialValue: true,
    });

    if (isCancel(useFallback) || !useFallback) {
      await select({
        message: "Return to Menu",
        options: [{ value: "back", label: "Enter" }],
      });
      return;
    }

    const basicConfig = generateBasicConfig(analyzedSchema);
    await presentAndSaveConfig(basicConfig, "Basic heuristic-based configuration");
    return;
  }

  s.stop("Config generated successfully");

  // Display AI analysis
  if (configResult.aiResponse) {
    const { explanation, confidence, warnings } = configResult.aiResponse;

    note(explanation, "AI Analysis");

    log.info(`Confidence: ${(confidence * 100).toFixed(0)}%`);

    if (warnings.length > 0) {
      log.warning("Warnings:");
      for (const warning of warnings) {
        console.log(`  - ${warning}`);
      }
    }
  }

  await presentAndSaveConfig(configResult.config, "AI-generated configuration");
}
