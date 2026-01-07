import { select, note } from "@clack/prompts";
import { generateSchemaSummary } from "@orion/schema";
import { displayHeader } from "../../../ui/display/index.js";
import { promptForGraphQLEndpoint } from "./shared/endpoint-prompt.js";
import { fetchAndAnalyzeSchema } from "./shared/schema-operations.js";

export async function handleSchemaAnalysis(): Promise<void> {
  displayHeader("Schema > Analyze");

  const endpoint = await promptForGraphQLEndpoint();
  if (!endpoint) return;

  const analyzedSchema = await fetchAndAnalyzeSchema(endpoint);
  if (!analyzedSchema) return;

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
}
