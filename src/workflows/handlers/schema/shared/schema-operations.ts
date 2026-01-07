import { spinner, select, log } from "@clack/prompts";
import {
  fetchSchema,
  isIntrospectionEnabled,
  analyzeSchema,
  type AnalyzedSchema,
} from "@orion/schema";

export async function fetchAndAnalyzeSchema(endpoint: string): Promise<AnalyzedSchema | null> {
  const s = spinner();
  s.start("Checking introspection availability...");

  const introspectionEnabled = await isIntrospectionEnabled(endpoint);

  if (!introspectionEnabled) {
    s.stop("Introspection check failed");
    log.error(
      "Introspection is not enabled on this endpoint. Please enable it or contact your GraphQL server administrator."
    );

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return null;
  }

  s.message("Fetching schema...");

  const result = await fetchSchema({ endpoint });

  if (!result.success || !result.schema) {
    s.stop("Schema fetch failed");
    log.error(`Failed to fetch schema: ${result.error}`);

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return null;
  }

  s.message("Analyzing schema...");

  const analyzedSchema = analyzeSchema(result.schema);

  s.stop("Schema analyzed successfully");

  return analyzedSchema;
}

export async function fetchSchemaOnly(endpoint: string): Promise<AnalyzedSchema | null> {
  const s = spinner();
  s.start("Fetching schema...");

  const result = await fetchSchema({ endpoint });

  if (!result.success || !result.schema) {
    s.stop("Schema fetch failed");
    log.error(`Failed to fetch schema: ${result.error}`);

    await select({
      message: "Return to Menu",
      options: [{ value: "back", label: "Enter" }],
    });
    return null;
  }

  s.message("Analyzing schema...");

  const analyzedSchema = analyzeSchema(result.schema);

  s.stop("Schema analyzed successfully");

  return analyzedSchema;
}
