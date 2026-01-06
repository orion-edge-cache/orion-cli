/**
 * GraphQL client utilities for testing
 */

import type { GraphQLResponse, RequestResult, CacheStatus } from "./types.js";

/**
 * Send a GraphQL request and parse the response with cache info
 */
export async function gql(
  url: string,
  query: string,
  variables?: Record<string, unknown>,
  useHeader = false
): Promise<GraphQLResponse> {
  const bodyStr = JSON.stringify({ query, variables });
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (useHeader) {
    headers["X-GraphQL-Query"] = bodyStr;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: useHeader ? null : bodyStr,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawBody: text,
    isHit: res.headers.get("x-cache")?.includes("HIT") || false,
    isMiss: res.headers.get("x-cache")?.includes("MISS") || false,
    surrogateKeys: res.headers.get("surrogate-key"),
    purgeKeys: res.headers.get("x-purge-keys"),
    cacheControl: res.headers.get("cache-control") || "",
  };
}

/**
 * Parse cache status from x-cache header
 */
export function parseCacheStatus(cacheHeader: string): CacheStatus {
  if (cacheHeader.includes("HIT")) return "HIT";
  if (cacheHeader.includes("MISS")) return "MISS";
  if (cacheHeader.includes("BYPASS") || cacheHeader.includes("PASS")) return "BYPASS";
  return "UNKNOWN";
}

/**
 * Send a GraphQL request for load testing (simplified response)
 */
export async function sendRequest(
  endpoint: string,
  query: string,
  type: string
): Promise<RequestResult> {
  const start = Date.now();

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Fastly-Debug": "1",
      },
      body: JSON.stringify({ query }),
    });

    const duration = Date.now() - start;
    const cacheHeader = res.headers.get("x-cache") || "";

    return {
      type,
      status: res.status,
      duration,
      cacheStatus: parseCacheStatus(cacheHeader),
      hasSurrogateKeys: !!res.headers.get("surrogate-key"),
      hasPurgeKeys: !!res.headers.get("x-purge-keys"),
    };
  } catch (error) {
    return {
      type,
      status: 0,
      duration: Date.now() - start,
      cacheStatus: "UNKNOWN",
      hasSurrogateKeys: false,
      hasPurgeKeys: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
