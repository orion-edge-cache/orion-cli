import { generateBasicConfig } from "@orion/schema";
import { displayHeader } from "../../../ui/display/index.js";
import { promptForGraphQLEndpoint } from "./shared/endpoint-prompt.js";
import { fetchSchemaOnly } from "./shared/schema-operations.js";
import { presentAndSaveConfig } from "./shared/config-presenter.js";

export async function handleBasicConfigGeneration(): Promise<void> {
  displayHeader("Schema > Generate Basic Config");

  const endpoint = await promptForGraphQLEndpoint();
  if (!endpoint) return;

  const analyzedSchema = await fetchSchemaOnly(endpoint);
  if (!analyzedSchema) return;

  const config = generateBasicConfig(analyzedSchema);

  await presentAndSaveConfig(config, "Heuristic-based configuration");
}
