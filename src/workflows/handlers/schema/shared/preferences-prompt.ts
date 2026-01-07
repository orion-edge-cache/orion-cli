import { select, confirm, text, isCancel } from "@clack/prompts";
import type { ConfigPreferences } from "@orion/schema";

export async function promptForAIPreferences(): Promise<ConfigPreferences | null> {
  const defaultTtl = await select({
    message: "Preferred default cache duration:",
    options: [
      { value: "short", label: "Short (1-5 minutes) - For frequently changing data" },
      { value: "medium", label: "Medium (5-15 minutes) - Balanced approach" },
      { value: "long", label: "Long (15-60 minutes) - For stable data" },
    ],
  });

  if (isCancel(defaultTtl)) return null;

  const aggressiveCaching = await confirm({
    message: "Prioritize caching performance over data freshness?",
    initialValue: false,
  });

  if (isCancel(aggressiveCaching)) return null;

  const customHints = await text({
    message: "Any additional context for the AI? (optional)",
    placeholder: "e.g., 'User data is highly sensitive', 'Posts change frequently'",
  });

  if (isCancel(customHints)) return null;

  const customHintsValue = customHints as string | undefined;

  return {
    defaultTtl: defaultTtl as "short" | "medium" | "long",
    aggressiveCaching: aggressiveCaching as boolean,
    ...(customHintsValue ? { customHints: customHintsValue } : {}),
  };
}
