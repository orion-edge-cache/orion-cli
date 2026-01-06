/**
 * Free AI Providers
 *
 * Support for free/local AI providers for demo purposes.
 * These can be replaced with paid providers later.
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export type FreeAIProvider = "ollama" | "groq" | "huggingface";

export interface FreeAIConfig {
  provider: FreeAIProvider;
  apiKey?: string | undefined; // Optional for Ollama (local)
  endpoint?: string | undefined; // Custom endpoint for Ollama
  model?: string | undefined;
}

// =============================================================================
// OLLAMA (Local, Free, No API Key)
// =============================================================================

/**
 * Ollama: Run LLMs locally on your machine
 * Download from: https://ollama.ai
 * 
 * After installation, run: ollama pull mistral
 * Then the service runs on http://localhost:11434
 */

async function callOllama(
  config: FreeAIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const endpoint = config.endpoint || "http://localhost:11434";
  const model = config.model || "mistral";

  const response = await fetch(`${endpoint}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\nUser: ${userPrompt}`,
      stream: false,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama error: ${response.status}. Is Ollama running on ${endpoint}?`
    );
  }

  const result = await response.json();
  return result.response;
}

// =============================================================================
// GROQ (Free Tier, Fast)
// =============================================================================

/**
 * Groq: Free API with generous limits
 * Sign up at: https://console.groq.com
 * Get free API key (no credit card required)
 * 
 * Free tier: 30 requests/minute, very fast inference
 */

async function callGroq(
  config: FreeAIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!config.apiKey) {
    throw new Error(
      "Groq API key required. Get one free at https://console.groq.com"
    );
  }

  const model = config.model || "mixtral-8x7b-32768";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
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
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// =============================================================================
// HUGGING FACE INFERENCE API (Free Tier)
// =============================================================================

/**
 * Hugging Face: Free inference API
 * Sign up at: https://huggingface.co
 * Get free API token from: https://huggingface.co/settings/tokens
 * 
 * Free tier: Rate limited but sufficient for demos
 */

async function callHuggingFace(
  config: FreeAIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!config.apiKey) {
    throw new Error(
      "Hugging Face API key required. Get one free at https://huggingface.co/settings/tokens"
    );
  }

  const model = config.model || "mistralai/Mistral-7B-Instruct-v0.1";

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\nUser: ${userPrompt}`,
        parameters: {
          max_length: 4096,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  
  // Hugging Face returns array of results
  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text;
  }

  throw new Error("Unexpected Hugging Face response format");
}

// =============================================================================
// MAIN INTERFACE
// =============================================================================

export async function callFreeAI(
  config: FreeAIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  switch (config.provider) {
    case "ollama":
      return callOllama(config, systemPrompt, userPrompt);
    case "groq":
      return callGroq(config, systemPrompt, userPrompt);
    case "huggingface":
      return callHuggingFace(config, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// =============================================================================
// PROVIDER INFO
// =============================================================================

export const PROVIDER_INFO = {
  ollama: {
    name: "Ollama (Local)",
    description: "Run LLMs locally on your machine - completely free, no API key needed",
    setup: "Download from https://ollama.ai, then run: ollama pull mistral",
    requiresApiKey: false,
    requiresInternet: false,
    cost: "Free (runs locally)",
    models: ["mistral", "neural-chat", "dolphin-mixtral"],
  },
  groq: {
    name: "Groq (Cloud)",
    description: "Fast cloud inference with generous free tier",
    setup: "Sign up at https://console.groq.com (no credit card required)",
    requiresApiKey: true,
    requiresInternet: true,
    cost: "Free tier: 30 req/min",
    models: ["mixtral-8x7b-32768", "llama2-70b-4096"],
  },
  huggingface: {
    name: "Hugging Face Inference API",
    description: "Free inference API with many model options",
    setup: "Sign up at https://huggingface.co, get token from settings",
    requiresApiKey: true,
    requiresInternet: true,
    cost: "Free tier (rate limited)",
    models: ["mistralai/Mistral-7B-Instruct-v0.1", "meta-llama/Llama-2-7b-chat"],
  },
};

// =============================================================================
// PROVIDER DETECTION
// =============================================================================

/**
 * Checks if Ollama is running locally
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Gets list of available Ollama models
 */
export async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch {
    return [];
  }
}
