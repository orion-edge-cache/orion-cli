/**
 * GraphQL Schema Introspection
 *
 * Fetches and parses GraphQL schema from a server using introspection.
 */

import type { IntrospectionQuery, IntrospectionSchema } from "./types.js";

// =============================================================================
// INTROSPECTION QUERY
// =============================================================================

/**
 * Standard GraphQL introspection query.
 * This is the full introspection query that retrieves all schema information.
 */
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
      directives {
        name
        description
        locations
        args {
          ...InputValue
        }
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

// =============================================================================
// INTROSPECTION FUNCTIONS
// =============================================================================

export interface IntrospectionOptions {
  /** GraphQL endpoint URL */
  endpoint: string;

  /** Optional headers (e.g., for authentication) */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;
}

export interface IntrospectionResult {
  success: boolean;
  schema?: IntrospectionSchema;
  error?: string;
}

/**
 * Fetches the GraphQL schema from a server using introspection.
 *
 * @param options - Introspection options including endpoint and headers
 * @returns The introspection result with schema or error
 */
export async function fetchSchema(
  options: IntrospectionOptions
): Promise<IntrospectionResult> {
  const { endpoint, headers = {}, timeout = 30000 } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        query: INTROSPECTION_QUERY,
        operationName: "IntrospectionQuery",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors
        .map((e: { message: string }) => e.message)
        .join("; ");
      return {
        success: false,
        error: `GraphQL errors: ${errorMessages}`,
      };
    }

    if (!result.data?.__schema) {
      return {
        success: false,
        error: "Invalid introspection response: missing __schema",
      };
    }

    return {
      success: true,
      schema: result.data.__schema as IntrospectionSchema,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Unknown error during introspection",
    };
  }
}

/**
 * Validates that introspection is enabled on the server.
 * Some servers disable introspection in production.
 *
 * @param endpoint - GraphQL endpoint URL
 * @returns Whether introspection is enabled
 */
export async function isIntrospectionEnabled(
  endpoint: string
): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ __schema { queryType { name } } }",
      }),
    });

    const result = await response.json();
    return !!(result.data?.__schema?.queryType);
  } catch {
    return false;
  }
}
