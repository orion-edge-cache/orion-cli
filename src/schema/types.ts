/**
 * Schema Analysis Types
 *
 * Type definitions for GraphQL schema introspection and analysis.
 */

// =============================================================================
// INTROSPECTION TYPES (from GraphQL spec)
// =============================================================================

export interface IntrospectionQuery {
  __schema: IntrospectionSchema;
}

export interface IntrospectionSchema {
  queryType: { name: string } | null;
  mutationType: { name: string } | null;
  subscriptionType: { name: string } | null;
  types: IntrospectionType[];
  directives: IntrospectionDirective[];
}

export interface IntrospectionType {
  kind: TypeKind;
  name: string;
  description: string | null;
  fields: IntrospectionField[] | null;
  inputFields: IntrospectionInputValue[] | null;
  interfaces: IntrospectionTypeRef[] | null;
  enumValues: IntrospectionEnumValue[] | null;
  possibleTypes: IntrospectionTypeRef[] | null;
}

export type TypeKind =
  | "SCALAR"
  | "OBJECT"
  | "INTERFACE"
  | "UNION"
  | "ENUM"
  | "INPUT_OBJECT"
  | "LIST"
  | "NON_NULL";

export interface IntrospectionField {
  name: string;
  description: string | null;
  args: IntrospectionInputValue[];
  type: IntrospectionTypeRef;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface IntrospectionInputValue {
  name: string;
  description: string | null;
  type: IntrospectionTypeRef;
  defaultValue: string | null;
}

export interface IntrospectionTypeRef {
  kind: TypeKind;
  name: string | null;
  ofType: IntrospectionTypeRef | null;
}

export interface IntrospectionEnumValue {
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface IntrospectionDirective {
  name: string;
  description: string | null;
  locations: string[];
  args: IntrospectionInputValue[];
}

// =============================================================================
// ANALYZED SCHEMA TYPES
// =============================================================================

export interface AnalyzedSchema {
  /** All entity types (objects with ID fields) */
  entities: EntityType[];

  /** Query operations */
  queries: OperationType[];

  /** Mutation operations */
  mutations: OperationType[];

  /** Relationships between types */
  relationships: TypeRelationship[];

  /** Raw type map for reference */
  typeMap: Map<string, IntrospectionType>;
}

export interface EntityType {
  /** Type name (e.g., "User", "Post") */
  name: string;

  /** Type description from schema */
  description: string | null;

  /** Whether this type has an ID field */
  hasId: boolean;

  /** Field names */
  fields: FieldInfo[];

  /** Types this entity references */
  references: string[];

  /** Types that reference this entity */
  referencedBy: string[];

  /** Inferred characteristics */
  characteristics: EntityCharacteristics;
}

export interface FieldInfo {
  name: string;
  typeName: string;
  isNonNull: boolean;
  isList: boolean;
  description: string | null;
}

export interface EntityCharacteristics {
  /** Likely to change frequently (has updatedAt, etc.) */
  isVolatile: boolean;

  /** Contains user-specific data */
  isUserSpecific: boolean;

  /** Appears to be a list/collection type */
  isCollection: boolean;

  /** Contains sensitive fields */
  hasSensitiveFields: boolean;

  /** Is a root query/mutation type */
  isRootType: boolean;
}

export interface OperationType {
  /** Operation name (e.g., "users", "createPost") */
  name: string;

  /** Description from schema */
  description: string | null;

  /** Return type name */
  returnType: string;

  /** Whether it returns a list */
  returnsList: boolean;

  /** Argument names and types */
  arguments: ArgumentInfo[];

  /** For mutations: which types are likely affected */
  affectedTypes: string[];
}

export interface ArgumentInfo {
  name: string;
  typeName: string;
  isRequired: boolean;
  description: string | null;
}

export interface TypeRelationship {
  /** Source type */
  from: string;

  /** Target type */
  to: string;

  /** Field name that creates the relationship */
  fieldName: string;

  /** Whether it's a list relationship (one-to-many) */
  isList: boolean;

  /** Relationship direction */
  direction: "outgoing" | "incoming";
}

// =============================================================================
// AI CONFIG GENERATION TYPES
// =============================================================================

export interface AIConfigRequest {
  /** Analyzed schema data */
  schema: AnalyzedSchema;

  /** User preferences/hints */
  preferences?: ConfigPreferences;
}

export interface ConfigPreferences {
  /** Default TTL preference (short, medium, long) */
  defaultTtl?: "short" | "medium" | "long";

  /** Whether to be aggressive with caching */
  aggressiveCaching?: boolean;

  /** Types that should never be cached */
  noCacheTypes?: string[];

  /** Types that should be private (user-specific) */
  privateTypes?: string[];

  /** Custom hints for the AI */
  customHints?: string;
}

export interface AIConfigResponse {
  /** Generated cache rules */
  rules: GeneratedCacheRule[];

  /** Generated invalidation mappings */
  invalidations: Record<string, string[]>;

  /** Explanation of the recommendations */
  explanation: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Warnings or considerations */
  warnings: string[];
}

export interface GeneratedCacheRule {
  /** Types this rule applies to */
  types: string[];

  /** Max age in seconds */
  maxAge: number;

  /** Stale-while-revalidate in seconds */
  staleWhileRevalidate?: number;

  /** Stale-if-error in seconds */
  staleIfError?: number;

  /** Cache scope */
  scope?: "public" | "private";

  /** Whether to bypass cache entirely */
  passthrough?: boolean;

  /** AI's reasoning for this rule */
  reasoning: string;
}

// =============================================================================
// ORION CONFIG TYPES (matches edge runtime config)
// =============================================================================

export interface OrionCacheConfig {
  version: string;
  name: string;
  defaults: {
    maxAge: number;
    staleWhileRevalidate: number;
    staleIfError: number;
  };
  rules: OrionCacheRule[];
  invalidations: Record<string, string[]>;
}

export interface OrionCacheRule {
  types: string[];
  maxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  scope?: "public" | "private";
  passthrough?: boolean;
}
