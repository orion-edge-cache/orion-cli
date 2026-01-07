/**
 * Schema Workflow Handlers
 *
 * Handlers for schema introspection, analysis, and AI-powered config generation.
 * Uses @orion/schema v2.0.0 with commercial AI providers only.
 */

import {
  isCancel,
  select,
  text,
  confirm,
  spinner,
  note,
  log,
  password,
} from "@clack/prompts";
import { displayHeader } from "../../ui/display/index.js";
import { writeConfig } from "../../config/index.js";
import {
  fetchSchema,
  isIntrospectionEnabled,
  analyzeSchema,
  generateSchemaSummary,
  generateCacheConfig,
  generateBasicConfig,
  PROVIDER_INFO,
  getSupportedProviders,
  getDefaultModel,
  getSavedCredentials,
  getAIKeyFromCredentials,
  getAIKeyFromEnv,
  saveAIKeyToCredentials,
  validateAPIKey,
  maskAPIKey,
  getEnvVarNames,
  terraformStateExists,
  getGraphQLEndpointFromTerraform,
  type AIProvider,
  type AIProviderConfig,
  type ConfigPreferences,
  type OrionCacheConfig,
} from "@orion/schema";

// =============================================================================
// SCHEMA ANALYSIS HANDLER
// =============================================================================

export const handleSchemaAnalysis = async () => {
  displayHeader("Schema > Analyze");

  // Try to get endpoint from terraform state first
  let defaultEndpoint = "";
  if (terraformStateExists()) {
    const tfEndpoint = await getGraphQLEndpointFromTerraform();
    if (tfEndpoint) {
      defaultEndpoint = tfEndpoint;
      log.info(`Found endpoint from terraform state: ${tfEndpoint}`);
    }
  }

  // Get GraphQL endpoint
  const endpoint = await text({
    message: "Enter your GraphQL endpoint URL:",
    placeholder: defaultEndpoint || "https://api.example.com/graphql",
    initialValue: defaultEndpoint,
    validate: (value) => {
      if (!value) return "Endpoint is required";
      try {
        new URL(value);
      } catch {
        return "Invalid URL format";
      }
    },
  });

  if (isCancel(endpoint)) return;

  // Check if introspection is enabled
  const s = spinner();
  s.start("Checking introspection availability...");

  const introspectionEnabled = await isIntrospectionEnabled(endpoint as string);

  if (!introspectionEnabled) {
    s.stop("Introspection check failed");
    log.error(
      "Introspection is not enabled on this endpoint. Please enable it or contact your GraphQL server administrator."
    );

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return;
  }

  s.message("Fetching schema...");

  // Fetch the schema
  const result = await fetchSchema({ endpoint: endpoint as string });

  if (!result.success || !result.schema) {
    s.stop("Schema fetch failed");
    log.error(`Failed to fetch schema: ${result.error}`);

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return;
  }

  s.message("Analyzing schema...");

  // Analyze the schema
  const analyzedSchema = analyzeSchema(result.schema);

  s.stop("Schema analyzed successfully");

  // Display summary
  const summary = generateSchemaSummary(analyzedSchema);

  console.log("\n");
  note(summary, "Schema Analysis");

  // Show statistics
  const stats = [
    `Entity Types: ${analyzedSchema.entities.filter((e) => !e.characteristics.isRootType).length}`,
    `Query Operations: ${analyzedSchema.queries.length}`,
    `Mutation Operations: ${analyzedSchema.mutations.length}`,
    `Type Relationships: ${analyzedSchema.relationships.length}`,
  ].join("\n");

  note(stats, "Statistics");

  await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  });
};

// =============================================================================
// AI CONFIG GENERATION HANDLER
// =============================================================================

export const handleAIConfigGeneration = async () => {
  displayHeader("Schema > Generate Config with AI");

  // Try to get endpoint from terraform state first
  let defaultEndpoint = "";
  if (terraformStateExists()) {
    const tfEndpoint = await getGraphQLEndpointFromTerraform();
    if (tfEndpoint) {
      defaultEndpoint = tfEndpoint;
      log.info(`Found endpoint from terraform state: ${tfEndpoint}`);
    }
  }

  // Get GraphQL endpoint
  const endpoint = await text({
    message: "Enter your GraphQL endpoint URL:",
    placeholder: defaultEndpoint || "https://api.example.com/graphql",
    initialValue: defaultEndpoint,
    validate: (value) => {
      if (!value) return "Endpoint is required";
      try {
        new URL(value);
      } catch {
        return "Invalid URL format";
      }
    },
  });

  if (isCancel(endpoint)) return;

  // Select AI provider
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

  if (isCancel(providerChoice)) return;

  const provider = providerChoice as AIProvider;
  const providerInfo = PROVIDER_INFO[provider];

  // Show provider info
  console.log("\n");
  note(
    `${providerInfo.description}\n\nModels: ${providerInfo.models.join(", ")}\nPricing: ${providerInfo.pricing}\nSetup: ${providerInfo.setupUrl}`,
    providerInfo.name
  );

  // Get API key - check credentials.json first, then env vars, then prompt
  let apiKey: string | null = null;
  let keySource: "credentials" | "env" | "user" = "user";

  // Check credentials.json
  apiKey = await getAIKeyFromCredentials(provider);
  if (apiKey) {
    keySource = "credentials";
    log.info(`Using saved API key: ${maskAPIKey(apiKey)}`);

    const useExisting = await confirm({
      message: "Use this saved API key?",
      initialValue: true,
    });

    if (isCancel(useExisting)) return;

    if (!useExisting) {
      apiKey = null;
    }
  }

  // Check environment variables
  if (!apiKey) {
    apiKey = getAIKeyFromEnv(provider);
    if (apiKey) {
      keySource = "env";
      const envVars = getEnvVarNames(provider);
      log.info(`Using API key from environment variable: ${envVars[0]}`);

      const useEnv = await confirm({
        message: "Use this environment variable?",
        initialValue: true,
      });

      if (isCancel(useEnv)) return;

      if (!useEnv) {
        apiKey = null;
      }
    }
  }

  // Prompt for API key if not found
  if (!apiKey) {
    const apiKeyInput = await password({
      message: `Enter your ${providerInfo.name} API key:`,
      validate: (value) => {
        if (!value) return "API key is required";
        const validation = validateAPIKey(provider, value);
        if (!validation.valid) return validation.error;
      },
    });

    if (isCancel(apiKeyInput)) return;
    apiKey = apiKeyInput as string;
    keySource = "user";

    // Offer to save the key
    const saveKey = await confirm({
      message: "Save this API key to ~/.config/orion/credentials.json?",
      initialValue: true,
    });

    if (!isCancel(saveKey) && saveKey) {
      await saveAIKeyToCredentials(provider, apiKey);
      log.success("API key saved securely (file permissions: 0600)");
    }
  }

  // Select model (optional)
  const useDefaultModel = await confirm({
    message: `Use default model (${getDefaultModel(provider)})?`,
    initialValue: true,
  });

  if (isCancel(useDefaultModel)) return;

  let model: string | undefined;
  if (!useDefaultModel) {
    const modelChoice = await select({
      message: "Select model:",
      options: providerInfo.models.map((m) => {
        const isDefault = m === getDefaultModel(provider);
        return {
          value: m,
          label: m,
          ...(isDefault && { hint: "default" }),
        };
      }),
    });

    if (isCancel(modelChoice)) return;
    model = modelChoice as string;
  }

  // Get preferences
  const defaultTtl = await select({
    message: "Preferred default cache duration:",
    options: [
      { value: "short", label: "Short (1-5 minutes) - For frequently changing data" },
      { value: "medium", label: "Medium (5-15 minutes) - Balanced approach" },
      { value: "long", label: "Long (15-60 minutes) - For stable data" },
    ],
  });

  if (isCancel(defaultTtl)) return;

  const aggressiveCaching = await confirm({
    message: "Prioritize caching performance over data freshness?",
    initialValue: false,
  });

  if (isCancel(aggressiveCaching)) return;

  const customHints = await text({
    message: "Any additional context for the AI? (optional)",
    placeholder: "e.g., 'User data is highly sensitive', 'Posts change frequently'",
  });

  if (isCancel(customHints)) return;

  // Fetch and analyze schema
  const s = spinner();
  s.start("Fetching schema...");

  const schemaResult = await fetchSchema({ endpoint: endpoint as string });

  if (!schemaResult.success || !schemaResult.schema) {
    s.stop("Schema fetch failed");
    log.error(`Failed to fetch schema: ${schemaResult.error}`);

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return;
  }

  s.message("Analyzing schema...");
  const analyzedSchema = analyzeSchema(schemaResult.schema);

  s.message(`Generating config with ${providerInfo.name}...`);

  // Prepare AI config
  const aiConfig: AIProviderConfig = {
    provider,
    apiKey: apiKey!,
    ...(model && { model }),
  };

  const customHintsValue = customHints as string | undefined;
  const preferences: ConfigPreferences = {
    defaultTtl: defaultTtl as "short" | "medium" | "long",
    aggressiveCaching: aggressiveCaching as boolean,
    ...(customHintsValue ? { customHints: customHintsValue } : {}),
  };

  // Generate config
  const configResult = await generateCacheConfig({
    schema: analyzedSchema,
    aiConfig,
    preferences,
  });

  if (!configResult.success || !configResult.config) {
    s.stop("Config generation failed");
    log.error(`Failed to generate config: ${configResult.error}`);

    // Offer fallback to basic config
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

    // Generate basic config
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
};

// =============================================================================
// BASIC CONFIG GENERATION HANDLER
// =============================================================================

export const handleBasicConfigGeneration = async () => {
  displayHeader("Schema > Generate Basic Config");

  // Try to get endpoint from terraform state first
  let defaultEndpoint = "";
  if (terraformStateExists()) {
    const tfEndpoint = await getGraphQLEndpointFromTerraform();
    if (tfEndpoint) {
      defaultEndpoint = tfEndpoint;
      log.info(`Found endpoint from terraform state: ${tfEndpoint}`);
    }
  }

  // Get GraphQL endpoint
  const endpoint = await text({
    message: "Enter your GraphQL endpoint URL:",
    placeholder: defaultEndpoint || "https://api.example.com/graphql",
    initialValue: defaultEndpoint,
    validate: (value) => {
      if (!value) return "Endpoint is required";
      try {
        new URL(value);
      } catch {
        return "Invalid URL format";
      }
    },
  });

  if (isCancel(endpoint)) return;

  // Fetch and analyze schema
  const s = spinner();
  s.start("Fetching schema...");

  const schemaResult = await fetchSchema({ endpoint: endpoint as string });

  if (!schemaResult.success || !schemaResult.schema) {
    s.stop("Schema fetch failed");
    log.error(`Failed to fetch schema: ${schemaResult.error}`);

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return;
  }

  s.message("Analyzing schema...");
  const analyzedSchema = analyzeSchema(schemaResult.schema);

  s.message("Generating config...");
  const config = generateBasicConfig(analyzedSchema);

  s.stop("Config generated successfully");

  await presentAndSaveConfig(config, "Heuristic-based configuration");
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function presentAndSaveConfig(
  config: OrionCacheConfig,
  description: string
): Promise<void> {
  // Display the generated config
  const configJson = JSON.stringify(config, null, 2);

  console.log("\n");
  note(configJson, description);

  // Ask to save
  const saveConfigChoice = await confirm({
    message: "Save this configuration?",
    initialValue: true,
  });

  if (isCancel(saveConfigChoice)) return;

  if (saveConfigChoice) {
    writeConfig(configJson);
    log.success("Configuration saved to ~/.config/orion/config.json");

    const deployNow = await confirm({
      message: "Deploy the configuration now?",
      initialValue: false,
    });

    if (!isCancel(deployNow) && deployNow) {
      // Import and call deploy handler
      const { handleDeployConfig } = await import("./config.js");
      await handleDeployConfig();
      return;
    }
  }

  await select({
    message: "Return to Menu",
    options: [{ value: "back", label: "Enter" }],
  });
}

// =============================================================================
// SCHEMA MENU
// =============================================================================

export const handleSchemaMenu = async () => {
  while (true) {
    displayHeader("Schema");

    const action = await select({
      message: "What would you like to do?",
      options: [
        {
          value: "analyze",
          label: "Analyze Schema",
          hint: "Introspect and analyze your GraphQL schema",
        },
        {
          value: "ai-config",
          label: "Generate Config with AI",
          hint: "Use AI to generate optimal caching rules",
        },
        {
          value: "basic-config",
          label: "Generate Basic Config",
          hint: "Generate config using heuristics (no AI)",
        },
        { value: "back", label: "Back to Main Menu" },
      ],
    });

    if (isCancel(action) || action === "back") {
      return;
    }

    switch (action) {
      case "analyze":
        await handleSchemaAnalysis();
        break;
      case "ai-config":
        await handleAIConfigGeneration();
        break;
      case "basic-config":
        await handleBasicConfigGeneration();
        break;
    }
  }
};
