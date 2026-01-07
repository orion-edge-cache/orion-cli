import { text, isCancel, log } from "@clack/prompts";
import { terraformStateExists, getGraphQLEndpointFromTerraform } from "@orion/schema";

export async function promptForGraphQLEndpoint(): Promise<string | null> {
  // Try to get endpoint from terraform state first
  let defaultEndpoint = "";
  if (terraformStateExists()) {
    const tfEndpoint = await getGraphQLEndpointFromTerraform();
    if (tfEndpoint) {
      defaultEndpoint = tfEndpoint;
      log.info(`Found endpoint from terraform state: ${tfEndpoint}`);
    }
  }

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

  if (isCancel(endpoint)) return null;

  return endpoint as string;
}
