/**
 * AI-Powered Cache Config Generator
 *
 * Uses LLM to analyze GraphQL schema and generate optimal caching configuration.
 * Supports both paid providers (Anthropic, OpenAI) and free providers (Ollama, Groq, HuggingFace).
 */

import type {
  AnalyzedSchema,
  ConfigPreferences,
  AIConfigResponse,
  GeneratedCacheRule,
  OrionCacheConfig,
  OrionCacheRule,
} from "./types.js";
import { generateSchemaSummary } from "./analyzer.js";
import { callFreeAI, type FreeAIConfig, isOllamaAvailable, getOllamaModels } from "./free-ai-providers.js";

// =============================================================================
// AI PROVIDER CONFIGURATION
// =============================================================================

export interface AIProviderConfig {
  provider: "anthropic" | "openai" | "ollama" | "groq" | "huggingface";
  apiKey?: string | undefined;
  model?: string | undefined;
  endpoint?: string | undefined; // For Ollama custom endpoint
}

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  ollama: "mistral",
  groq: "mixtral-8x7b-32768",
  huggingface: "mistralai/Mistral-7B-Instruct-v0.1",
};

// =============================================================================
// PROMPT CONSTRUCTION
// =============================================================================

function buildSystemPrompt(): string {
  return `You are an expert in GraphQL caching strategies and CDN configuration. Your task is to analyze a GraphQL schema and recommend optimal caching rules for an edge caching layer.

## Caching Concepts

1. **maxAge**: How long (in seconds) a response can be served from cache before it's considered stale.
   - Short (60-300s): For frequently changing data
   - Medium (300-900s): For moderately stable data
   - Long (900-3600s): For rarely changing data

2. **staleWhileRevalidate**: Time (in seconds) during which stale content can be served while fresh content is fetched in the background.
   - Improves perceived performance
   - Good for data that's acceptable to be slightly outdated

3. **staleIfError**: Time (in seconds) during which stale content can be served if the origin returns an error.
   - Improves reliability
   - Good for critical data that should always be available

4. **scope**: 
   - "public": Can be cached by shared caches (CDN). Use for data that's the same for all users.
   - "private": Can only be cached by user's browser. Use for user-specific data.

5. **passthrough**: When true, bypasses cache entirely. Use for:
   - Real-time data that must always be fresh
   - Highly sensitive data
   - Data that changes on every request

## Guidelines

1. **Entity Types with ID fields** are good candidates for caching with surrogate keys
2. **User-specific data** (containing userId, author, etc.) should typically be "private"
3. **Volatile data** (with updatedAt, viewCount, etc.) needs shorter TTLs
4. **Sensitive data** (email, password, etc.) should be "private" or passthrough
5. **List queries** benefit from staleWhileRevalidate for pagination
6. **Mutations** should always invalidate related cache entries

## Output Format

Respond with a JSON object containing:
- rules: Array of cache rules with types, maxAge, staleWhileRevalidate, staleIfError, scope, passthrough, and reasoning
- invalidations: Object mapping mutation names to arrays of type patterns to invalidate
- explanation: Overall explanation of the caching strategy
- confidence: Number 0-1 indicating confidence in recommendations
- warnings: Array of potential issues or considerations

Be specific and practical. Consider real-world usage patterns.`;
}

function buildUserPrompt(
  schema: AnalyzedSchema,
  preferences?: ConfigPreferences
): string {
  const summary = generateSchemaSummary(schema);

  let prompt = `Analyze the following GraphQL schema and generate caching configuration:\n\n${summary}\n`;

  if (preferences) {
    prompt += "\n## User Preferences\n\n";

    if (preferences.defaultTtl) {
      const ttlMap = { short: "60-300s", medium: "300-900s", long: "900-3600s" };
      prompt += `- Preferred default TTL: ${preferences.defaultTtl} (${ttlMap[preferences.defaultTtl]})\n`;
    }

    if (preferences.aggressiveCaching !== undefined) {
      prompt += `- Aggressive caching: ${preferences.aggressiveCaching ? "Yes, prioritize performance" : "No, prioritize freshness"}\n`;
    }

    if (preferences.noCacheTypes && preferences.noCacheTypes.length > 0) {
      prompt += `- Types that should never be cached: ${preferences.noCacheTypes.join(", ")}\n`;
    }

    if (preferences.privateTypes && preferences.privateTypes.length > 0) {
      prompt += `- Types that should be private (user-specific): ${preferences.privateTypes.join(", ")}\n`;
    }

    if (preferences.customHints) {
      prompt += `- Additional context: ${preferences.customHints}\n`;
    }
  }

  prompt += `
Generate a comprehensive caching configuration. Consider:
1. Which types should be cached and for how long
2. Which types need private scope
3. Which types should bypass cache entirely
4. What invalidation rules should apply when mutations occur

Respond with valid JSON only.`;

  return prompt;
}

// =============================================================================
// AI API CALLS
// =============================================================================

async function callAnthropic(
  config: AIProviderConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const model = config.model || DEFAULT_MODELS.anthropic;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

async function callOpenAI(
  config: AIProviderConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const model = config.model || DEFAULT_MODELS.openai;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey!}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseAIResponse(responseText: string): AIConfigResponse {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = responseText;

  // Try to extract from code block
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!Array.isArray(parsed.rules)) {
      throw new Error("Missing or invalid 'rules' array");
    }

    // Ensure all rules have required fields
    const rules: GeneratedCacheRule[] = parsed.rules.map(
      (rule: Partial<GeneratedCacheRule>) => ({
        types: rule.types || [],
        maxAge: rule.maxAge ?? 300,
        staleWhileRevalidate: rule.staleWhileRevalidate,
        staleIfError: rule.staleIfError,
        scope: rule.scope,
        passthrough: rule.passthrough,
        reasoning: rule.reasoning || "No reasoning provided",
      })
    );

    return {
      rules,
      invalidations: parsed.invalidations || {},
      explanation: parsed.explanation || "No explanation provided",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (error) {
    throw new Error(
      `Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// =============================================================================
// CONFIG GENERATION
// =============================================================================

export interface GenerateConfigOptions {
  schema: AnalyzedSchema;
  aiConfig: AIProviderConfig;
  preferences?: ConfigPreferences;
}

export interface GenerateConfigResult {
  success: boolean;
  config?: OrionCacheConfig;
  aiResponse?: AIConfigResponse;
  error?: string;
}

/**
 * Generates an Orion cache configuration using AI analysis.
 *
 * @param options - Generation options including schema and AI config
 * @returns Generated configuration or error
 */
export async function generateCacheConfig(
  options: GenerateConfigOptions
): Promise<GenerateConfigResult> {
  const { schema, aiConfig, preferences } = options;

  try {
    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(schema, preferences);

    // Call AI provider
    let responseText: string;

    if (aiConfig.provider === "anthropic") {
      if (!aiConfig.apiKey) throw new Error("Anthropic API key required");
      responseText = await callAnthropic(aiConfig, systemPrompt, userPrompt);
    } else if (aiConfig.provider === "openai") {
      if (!aiConfig.apiKey) throw new Error("OpenAI API key required");
      responseText = await callOpenAI(aiConfig, systemPrompt, userPrompt);
    } else if (["ollama", "groq", "huggingface"].includes(aiConfig.provider)) {
      // Use free AI provider
      const freeConfig: FreeAIConfig = {
        provider: aiConfig.provider as "ollama" | "groq" | "huggingface",
        apiKey: aiConfig.apiKey,
        endpoint: aiConfig.endpoint,
        model: aiConfig.model,
      };
      responseText = await callFreeAI(freeConfig, systemPrompt, userPrompt);
    } else {
      throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
    }

    // Parse AI response
    const aiResponse = parseAIResponse(responseText);

    // Convert to Orion config format
    const config = convertToOrionConfig(aiResponse, preferences);

    return {
      success: true,
      config,
      aiResponse,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Converts AI response to Orion cache config format.
 */
function convertToOrionConfig(
  aiResponse: AIConfigResponse,
  preferences?: ConfigPreferences
): OrionCacheConfig {
  // Determine default TTL based on preferences
  let defaultMaxAge = 300; // 5 minutes default
  if (preferences?.defaultTtl === "short") {
    defaultMaxAge = 60;
  } else if (preferences?.defaultTtl === "long") {
    defaultMaxAge = 900;
  }

  // Convert AI rules to Orion format (strip reasoning)
  const rules: OrionCacheRule[] = aiResponse.rules.map((rule) => {
    const orionRule: OrionCacheRule = {
      types: rule.types,
    };

    if (rule.maxAge !== undefined) {
      orionRule.maxAge = rule.maxAge;
    }
    if (rule.staleWhileRevalidate !== undefined && rule.staleWhileRevalidate > 0) {
      orionRule.staleWhileRevalidate = rule.staleWhileRevalidate;
    }
    if (rule.staleIfError !== undefined && rule.staleIfError > 0) {
      orionRule.staleIfError = rule.staleIfError;
    }
    if (rule.scope) {
      orionRule.scope = rule.scope;
    }
    if (rule.passthrough) {
      orionRule.passthrough = true;
    }

    return orionRule;
  });

  return {
    version: "1.0",
    name: "orion",
    defaults: {
      maxAge: defaultMaxAge,
      staleWhileRevalidate: 0,
      staleIfError: 0,
    },
    rules,
    invalidations: aiResponse.invalidations,
  };
}

// =============================================================================
// FALLBACK CONFIG GENERATION (without AI)
// =============================================================================

/**
 * Generates a basic cache configuration without AI.
 * Uses heuristics based on schema analysis.
 *
 * @param schema - Analyzed schema
 * @returns Basic cache configuration
 */
export function generateBasicConfig(schema: AnalyzedSchema): OrionCacheConfig {
  const rules: OrionCacheRule[] = [];

  // Group entities by characteristics
  const volatileTypes: string[] = [];
  const userSpecificTypes: string[] = [];
  const sensitiveTypes: string[] = [];
  const stableTypes: string[] = [];

  for (const entity of schema.entities) {
    if (entity.characteristics.isRootType) continue;

    if (entity.characteristics.hasSensitiveFields) {
      sensitiveTypes.push(entity.name);
    } else if (entity.characteristics.isUserSpecific) {
      userSpecificTypes.push(entity.name);
    } else if (entity.characteristics.isVolatile) {
      volatileTypes.push(entity.name);
    } else {
      stableTypes.push(entity.name);
    }
  }

  // Create rules for each group
  if (sensitiveTypes.length > 0) {
    rules.push({
      types: sensitiveTypes,
      scope: "private",
      maxAge: 60,
    });
  }

  if (userSpecificTypes.length > 0) {
    rules.push({
      types: userSpecificTypes,
      scope: "private",
      maxAge: 300,
      staleWhileRevalidate: 60,
    });
  }

  if (volatileTypes.length > 0) {
    rules.push({
      types: volatileTypes,
      maxAge: 60,
      staleWhileRevalidate: 30,
    });
  }

  if (stableTypes.length > 0) {
    rules.push({
      types: stableTypes,
      maxAge: 900,
      staleWhileRevalidate: 300,
      staleIfError: 3600,
    });
  }

  // Generate invalidation rules from mutations
  const invalidations: Record<string, string[]> = {};

  for (const mutation of schema.mutations) {
    if (mutation.affectedTypes.length > 0) {
      // Create pattern for each affected type
      const patterns = mutation.affectedTypes.map((type) => `${type}:*`);
      invalidations[mutation.name] = patterns;
    }
  }

  return {
    version: "1.0",
    name: "orion",
    defaults: {
      maxAge: 300,
      staleWhileRevalidate: 60,
      staleIfError: 0,
    },
    rules,
    invalidations,
  };
}

// =============================================================================
// PROVIDER UTILITIES
// =============================================================================

export { isOllamaAvailable, getOllamaModels } from "./free-ai-providers.js";
export { PROVIDER_INFO } from "./free-ai-providers.js";
