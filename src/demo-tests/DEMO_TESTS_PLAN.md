# Demo Tests Plan

## Overview

A rewritten cache test suite that correctly routes all requests through the VCL endpoint, reflecting the actual production architecture.

---

## Architecture Understanding

```
Client → VCL Service (CDN) → Compute@Edge → Origin GraphQL
                ↑
         All tests hit here
```

**Key Principle:** Tests should only send requests to the VCL endpoint. The VCL service handles:
1. Converting POST to GET for cacheable queries
2. Setting `X-GraphQL-Query` header with escaped body
3. Forwarding to Compute on cache MISS
4. Caching responses with Surrogate-Key support

---

## File Structure

```
demo-tests/
├── index.ts                    # Module exports
├── cache-tests.ts              # Main test orchestrator
├── suites/
│   ├── index.ts                # Suite exports
│   ├── connectivity.ts         # Connectivity test suite
│   ├── cache-mechanics.ts      # Cache behavior tests
│   ├── surrogate-keys.ts       # Entity extraction tests
│   ├── invalidation.ts         # Mutation/purge tests
│   └── edge-cases.ts           # Error handling tests
└── utils/
    ├── index.ts                # Utility exports
    ├── types.ts                # TypeScript interfaces
    ├── graphql-client.ts       # GraphQL request helper
    ├── test-runner.ts          # Test execution helpers
    └── output.ts               # Display/formatting helpers
```

---

## Type Definitions (`utils/types.ts`)

```typescript
// Clearer naming for endpoints
interface Endpoints {
  vclService: string;    // The CDN/VCL endpoint (all tests use this)
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  run: (endpoints: Endpoints) => Promise<TestResult[]>;
}

interface GraphQLResponse {
  status: number;
  body: any;
  cacheStatus: 'HIT' | 'MISS' | 'UNKNOWN';
  surrogateKeys: string | null;
  purgeKeys: string | null;
  cacheControl: string;
}
```

---

## GraphQL Client (`utils/graphql-client.ts`)

Simplified client - no `useHeader` parameter since all requests go through VCL:

```typescript
async function sendGraphQL(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse>
```

- Always sends POST with body (standard GraphQL)
- VCL handles the header transformation internally
- Parses cache-related headers from response

---

## Test Suites

### 1. Connectivity Suite (`suites/connectivity.ts`)

| Test | Query | Validates |
|------|-------|-----------|
| VCL Reachability | `query { __typename }` | VCL endpoint responds with 200 |
| Origin Connection | `query { __typename }` | Response contains `__typename: "Query"` |

**Removed:** Direct Compute endpoint test (not part of normal flow)

---

### 2. Cache Mechanics Suite (`suites/cache-mechanics.ts`)

| Test | Query | Validates |
|------|-------|-----------|
| Cache Miss Then Hit | `query { users(limit: 1, offset: ${uid}) { id } }` | First request MISS, second HIT |
| Variable Sensitivity | `query GetUser($id: ID!) { user(id: $id) { id } }` | Different variables = different cache entries |
| Cache Headers Present | `query { users(limit: 1) { id } }` | Response has Cache-Control header |
| Concurrent Requests | `query { users(limit: 1) { id } }` | Multiple simultaneous requests succeed |

---

### 3. Surrogate Keys Suite (`suites/surrogate-keys.ts`)

| Test | Query | Validates |
|------|-------|-----------|
| User Entity Keys | `query { users(limit: 3) { id } }` | `Surrogate-Key` header contains `User:X` keys |
| Post Entity Keys | `query { posts(limit: 3) { id } }` | `Surrogate-Key` header contains `Post:X` keys |
| Nested Entity Keys | `query { posts(limit: 2) { id author { id } } }` | Header contains both `Post:X` and `User:X` |

**Key Change:** All tests now go through VCL endpoint, not Compute directly.

---

### 4. Invalidation Suite (`suites/invalidation.ts`)

| Test | Query | Validates |
|------|-------|-----------|
| Mutation Cache Bypass | `mutation { updateUser(...) { id } }` | Cache-Control contains `no-store` or `no-cache` |
| Mutation Purge Keys | `mutation { updateUser(...) { id } }` | `X-Purge-Keys` header contains affected entity |

---

### 5. Edge Cases Suite (`suites/edge-cases.ts`)

| Test | Query | Validates |
|------|-------|-----------|
| Invalid Query | `query { nonExistentField }` | Response contains `errors` array |
| Non-existent ID | `query { user(id: "99999") { id } }` | No server error (status < 500) |

---

## Main Orchestrator (`cache-tests.ts`)

```typescript
export async function runDemoCacheTests(): Promise<void> {
  // 1. Get VCL endpoint from Terraform outputs
  // 2. Print header and endpoint info
  // 3. Run each test suite in sequence
  // 4. Print summary results
}
```

---

## Key Differences from Original Tests

| Aspect | Original | New |
|--------|----------|-----|
| Endpoints | `ctx.endpoint` + `ctx.computeEndpoint` | `endpoints.vclService` only |
| Direct Compute access | Yes (Surrogate Key tests) | No |
| `useHeader` parameter | Yes | Removed |
| Query syntax | Mixed (shorthand + explicit) | Always explicit `query { ... }` |
| Naming | `ctx`, `endpoint` | `endpoints`, `vclService` |

---

## Implementation Order

1. `utils/types.ts` - Type definitions
2. `utils/graphql-client.ts` - Request helper
3. `utils/test-runner.ts` - Test execution helpers
4. `utils/output.ts` - Display helpers
5. `utils/index.ts` - Utility exports
6. `suites/connectivity.ts` - First test suite
7. `suites/cache-mechanics.ts` - Cache behavior tests
8. `suites/surrogate-keys.ts` - Entity key tests
9. `suites/invalidation.ts` - Mutation tests
10. `suites/edge-cases.ts` - Error handling tests
11. `suites/index.ts` - Suite exports
12. `cache-tests.ts` - Main orchestrator
13. `index.ts` - Module exports

---

## Line Count Targets

| File | Target Lines |
|------|--------------|
| `utils/types.ts` | ~50 |
| `utils/graphql-client.ts` | ~50 |
| `utils/test-runner.ts` | ~60 |
| `utils/output.ts` | ~80 |
| Each suite file | ~50-80 |
| `cache-tests.ts` | ~80 |

**Total:** ~600-700 lines across all files (vs original ~400 lines in fewer, longer files)
