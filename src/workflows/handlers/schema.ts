/**
 * Schema Workflow Handlers
 *
 * Handlers for schema introspection, analysis, and AI-powered config generation.
 */

import {
  isCancel,
  select,
  text,
  confirm,
  spinner,
  note,
  log,
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
  isOllamaAvailable,
  getOllamaModels,
  PROVIDER_INFO,
  type AIProviderConfig,
  type ConfigPreferences,
  type OrionCacheConfig,
} from "@orion/schema";

// =============================================================================
// SCHEMA ANALYSIS HANDLER
// =============================================================================

export const handleSchemaAnalysis = async () => {
  displayHeader("Schema > Analyze");

  // Get GraphQL endpoint
  const endpoint = await text({
    message: "Enter your GraphQL endpoint URL:",
    placeholder: "https://api.example.com/graphql",
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

  // Get GraphQL endpoint
  const endpoint = await text({
    message: "Enter your GraphQL endpoint URL:",
    placeholder: "https://api.example.com/graphql",
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
  const providerChoice = await select({
    message: "Select AI provider:",
    options: [
      {
        value: "free",
        label: "Free Providers (Ollama, Groq, Hugging Face)",
        hint: "No credit card required",
      },
      {
        value: "paid",
        label: "Paid Providers (Anthropic, OpenAI)",
        hint: "Requires API key",
      },
    ],
  });

  if (isCancel(providerChoice)) return;

  let provider: string;
  let apiKey: string | undefined;
  let customEndpoint: string | undefined;

  if (providerChoice === "free") {
    // Check if Ollama is available
    const ollamaAvailable = await isOllamaAvailable();

    const freeProvider = await select({
      message: "Select free provider:",
      options: [
        {
          value: "ollama",
          label: "Ollama (Local)",
          hint: ollamaAvailable ? "✓ Running locally" : "⚠ Not detected",
        },
        {
          value: "groq",
          label: "Groq (Cloud)",
          hint: "Fast, generous free tier",
        },
        {
          value: "huggingface",
          label: "Hugging Face Inference API",
          hint: "Free tier available",
        },
      ],
    });

    if (isCancel(freeProvider)) return;

    provider = freeProvider as string;

    // Show provider info
    const info = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO];
    console.log("\n");
    note(
      `${info.description}\n\nSetup: ${info.setup}\nCost: ${info.cost}`,
      `${info.name}`
    );

    // Get API key if needed
    if (provider !== "ollama") {
      const apiKeyInput = await text({
        message: `Enter your ${provider === "groq" ? "Groq" : "Hugging Face"} API key:`,
        placeholder: provider === "groq" ? "gsk_..." : "hf_...",
        validate: (value) => {
          if (!value) return "API key is required";
          if (value.length < 10) return "API key seems too short";
        },
      });

      if (isCancel(apiKeyInput)) return;
      apiKey = apiKeyInput as string;
    } else {
      // For Ollama, ask about custom endpoint
      const useCustomEndpoint = await confirm({
        message: "Use custom Ollama endpoint? (default: http://localhost:11434)",
        initialValue: false,
      });

      if (!isCancel(useCustomEndpoint) && useCustomEndpoint) {
        const endpointInput = await text({
          message: "Enter Ollama endpoint:",
          placeholder: "http://localhost:11434",
        });

        if (isCancel(endpointInput)) return;
        customEndpoint = endpointInput as string;
      }
    }
  } else {
    // Paid providers
    const paidProvider = await select({
      message: "Select paid provider:",
      options: [
        { value: "anthropic", label: "Anthropic (Claude)" },
        { value: "openai", label: "OpenAI (GPT-4)" },
      ],
    });

    if (isCancel(paidProvider)) return;

    provider = paidProvider as string;

    const apiKeyInput = await text({
      message: `Enter your ${provider === "anthropic" ? "Anthropic" : "OpenAI"} API key:`,
      placeholder: provider === "anthropic" ? "sk-ant-..." : "sk-...",
      validate: (value) => {
        if (!value) return "API key is required";
        if (value.length < 20) return "API key seems too short";
      },
    });

    if (isCancel(apiKeyInput)) return;
    apiKey = apiKeyInput as string;
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

  s.message("Generating config with AI...");

  // Prepare AI config
  const aiConfig: AIProviderConfig = {
    provider: provider as any,
    apiKey,
    endpoint: customEndpoint,
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

  // Get GraphQL endpoint
  const endpoint = await text({
    message: "Enter your GraphQL endpoint URL:",
    placeholder: "https://api.example.com/graphql",
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
  const saveConfig = await confirm({
    message: "Save this configuration?",
    initialValue: true,
  });

  if (isCancel(saveConfig)) return;

  if (saveConfig) {
    writeConfig(configJson);
    log.success("Configuration saved to ~/.orion/config.json");

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
