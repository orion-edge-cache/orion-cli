/**
 * GraphQL client for cache tests
 * 
 * All requests are sent as standard POST requests to the VCL endpoint.
 * VCL handles the transformation (POST→GET, header escaping) internally.
 */

import type { GraphQLResponse, CacheStatus } from "./types.js";

/**
 * Parse cache status from x-cache header
 */
function parseCacheStatus(header: string | null): CacheStatus {
  if (!header) return "UNKNOWN";
  if (header.includes("HIT")) return "HIT";
  if (header.includes("MISS")) return "MISS";
  if (header.includes("BYPASS") || header.includes("PASS")) return "BYPASS";
  return "UNKNOWN";
}

/**
 * Send a GraphQL request to the VCL endpoint
 * 
 * @param endpoint - The VCL service URL
 * @param query - GraphQL query string (should use explicit "query" or "mutation" keyword)
 * @param variables - Optional GraphQL variables
 */
export async function sendGraphQL(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse> {
  const body = JSON.stringify({ query, variables });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const rawBody = await response.text();
  let parsedBody: Record<string, unknown> | null = null;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // Response is not valid JSON
  }

  return {
    status: response.status,
    body: parsedBody,
    rawBody,
    cacheStatus: parseCacheStatus(response.headers.get("x-cache")),
    surrogateKeys: response.headers.get("surrogate-key"),
    purgeKeys: response.headers.get("x-purge-keys"),
    cacheControl: response.headers.get("cache-control") || "",
  };
}
