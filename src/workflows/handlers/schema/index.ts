import { select, isCancel } from "@clack/prompts";
import { displayHeader } from "../../../ui/display/index.js";

export { handleSchemaAnalysis } from "./analyze.js";
export { handleAIConfigGeneration } from "./ai-config.js";
export { handleBasicConfigGeneration } from "./basic-config.js";

export async function handleSchemaMenu(): Promise<void> {
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
      case "analyze": {
        const { handleSchemaAnalysis } = await import("./analyze.js");
        await handleSchemaAnalysis();
        break;
      }
      case "ai-config": {
        const { handleAIConfigGeneration } = await import("./ai-config.js");
        await handleAIConfigGeneration();
        break;
      }
      case "basic-config": {
        const { handleBasicConfigGeneration } = await import("./basic-config.js");
        await handleBasicConfigGeneration();
        break;
      }
    }
  }
}
