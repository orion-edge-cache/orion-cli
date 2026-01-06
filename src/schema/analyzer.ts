/**
 * Schema Analyzer
 *
 * Analyzes a GraphQL schema to extract types, relationships, and characteristics
 * that inform caching decisions.
 */

import type {
  IntrospectionSchema,
  IntrospectionType,
  IntrospectionField,
  IntrospectionTypeRef,
  AnalyzedSchema,
  EntityType,
  FieldInfo,
  EntityCharacteristics,
  OperationType,
  ArgumentInfo,
  TypeRelationship,
} from "./types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Built-in GraphQL types to ignore */
const BUILT_IN_TYPES = new Set([
  "String",
  "Int",
  "Float",
  "Boolean",
  "ID",
  "__Schema",
  "__Type",
  "__TypeKind",
  "__Field",
  "__InputValue",
  "__EnumValue",
  "__Directive",
  "__DirectiveLocation",
]);

/** Field names that suggest volatility (frequent updates) */
const VOLATILE_FIELD_PATTERNS = [
  "updatedAt",
  "modifiedAt",
  "lastModified",
  "lastUpdated",
  "lastSeen",
  "lastActive",
  "viewCount",
  "likeCount",
  "commentCount",
  "score",
  "rating",
  "status",
  "state",
];

/** Field names that suggest user-specific data */
const USER_SPECIFIC_PATTERNS = [
  "userId",
  "ownerId",
  "authorId",
  "creatorId",
  "user",
  "owner",
  "author",
  "creator",
  "me",
  "currentUser",
  "viewer",
  "myProfile",
];

/** Field names that suggest sensitive data */
const SENSITIVE_FIELD_PATTERNS = [
  "email",
  "password",
  "passwordHash",
  "token",
  "secret",
  "apiKey",
  "privateKey",
  "ssn",
  "creditCard",
  "phone",
  "address",
  "salary",
  "balance",
];

/** Mutation name patterns and their likely affected types */
const MUTATION_PATTERNS: Record<string, (name: string) => string[]> = {
  create: (name) => [extractTypeFromMutation(name, "create")],
  add: (name) => [extractTypeFromMutation(name, "add")],
  insert: (name) => [extractTypeFromMutation(name, "insert")],
  update: (name) => [extractTypeFromMutation(name, "update")],
  edit: (name) => [extractTypeFromMutation(name, "edit")],
  modify: (name) => [extractTypeFromMutation(name, "modify")],
  delete: (name) => [extractTypeFromMutation(name, "delete")],
  remove: (name) => [extractTypeFromMutation(name, "remove")],
  destroy: (name) => [extractTypeFromMutation(name, "destroy")],
};

// =============================================================================
// MAIN ANALYZER
// =============================================================================

/**
 * Analyzes a GraphQL schema and extracts information useful for caching decisions.
 *
 * @param schema - The introspection schema to analyze
 * @returns Analyzed schema with entities, operations, and relationships
 */
export function analyzeSchema(schema: IntrospectionSchema): AnalyzedSchema {
  // Build type map for quick lookups
  const typeMap = new Map<string, IntrospectionType>();
  for (const type of schema.types) {
    typeMap.set(type.name, type);
  }

  // Extract entities (object types with ID fields)
  const entities = extractEntities(schema.types, typeMap);

  // Extract query operations
  const queries = schema.queryType
    ? extractOperations(typeMap.get(schema.queryType.name), typeMap, "query")
    : [];

  // Extract mutation operations
  const mutations = schema.mutationType
    ? extractOperations(
        typeMap.get(schema.mutationType.name),
        typeMap,
        "mutation"
      )
    : [];

  // Build relationship graph
  const relationships = buildRelationships(entities, typeMap);

  // Enrich entities with relationship info
  enrichEntitiesWithRelationships(entities, relationships);

  return {
    entities,
    queries,
    mutations,
    relationships,
    typeMap,
  };
}

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

function extractEntities(
  types: IntrospectionType[],
  typeMap: Map<string, IntrospectionType>
): EntityType[] {
  const entities: EntityType[] = [];

  for (const type of types) {
    // Skip built-in types and non-object types
    if (BUILT_IN_TYPES.has(type.name) || type.name.startsWith("__")) {
      continue;
    }

    if (type.kind !== "OBJECT" || !type.fields) {
      continue;
    }

    // Check if this type has an ID field (makes it an entity)
    const hasId = type.fields.some(
      (f) => f.name === "id" || f.name === "_id" || f.name === "ID"
    );

    // Extract field information
    const fields = type.fields.map((f) => extractFieldInfo(f));

    // Find referenced types
    const references = findReferencedTypes(type.fields, typeMap);

    // Analyze characteristics
    const characteristics = analyzeCharacteristics(type, fields);

    entities.push({
      name: type.name,
      description: type.description,
      hasId,
      fields,
      references,
      referencedBy: [], // Will be filled in later
      characteristics,
    });
  }

  return entities;
}

function extractFieldInfo(field: IntrospectionField): FieldInfo {
  const { typeName, isNonNull, isList } = unwrapType(field.type);

  return {
    name: field.name,
    typeName,
    isNonNull,
    isList,
    description: field.description,
  };
}

function unwrapType(typeRef: IntrospectionTypeRef): {
  typeName: string;
  isNonNull: boolean;
  isList: boolean;
} {
  let isNonNull = false;
  let isList = false;
  let current = typeRef;

  // Unwrap NON_NULL and LIST wrappers
  while (current.ofType) {
    if (current.kind === "NON_NULL") {
      isNonNull = true;
    } else if (current.kind === "LIST") {
      isList = true;
    }
    current = current.ofType;
  }

  return {
    typeName: current.name || "Unknown",
    isNonNull,
    isList,
  };
}

function findReferencedTypes(
  fields: IntrospectionField[],
  typeMap: Map<string, IntrospectionType>
): string[] {
  const references = new Set<string>();

  for (const field of fields) {
    const { typeName } = unwrapType(field.type);

    // Check if this is a reference to another object type
    const referencedType = typeMap.get(typeName);
    if (
      referencedType &&
      referencedType.kind === "OBJECT" &&
      !BUILT_IN_TYPES.has(typeName) &&
      !typeName.startsWith("__")
    ) {
      references.add(typeName);
    }
  }

  return [...references];
}

function analyzeCharacteristics(
  type: IntrospectionType,
  fields: FieldInfo[]
): EntityCharacteristics {
  const fieldNames = fields.map((f) => f.name.toLowerCase());

  const isVolatile = VOLATILE_FIELD_PATTERNS.some((pattern) =>
    fieldNames.some((name) => name.includes(pattern.toLowerCase()))
  );

  const isUserSpecific = USER_SPECIFIC_PATTERNS.some((pattern) =>
    fieldNames.some((name) => name.includes(pattern.toLowerCase()))
  );

  const hasSensitiveFields = SENSITIVE_FIELD_PATTERNS.some((pattern) =>
    fieldNames.some((name) => name.includes(pattern.toLowerCase()))
  );

  const isCollection =
    type.name.endsWith("Connection") ||
    type.name.endsWith("Edge") ||
    type.name.endsWith("List") ||
    type.name.endsWith("Page");

  const isRootType =
    type.name === "Query" ||
    type.name === "Mutation" ||
    type.name === "Subscription";

  return {
    isVolatile,
    isUserSpecific,
    isCollection,
    hasSensitiveFields,
    isRootType,
  };
}

// =============================================================================
// OPERATION EXTRACTION
// =============================================================================

function extractOperations(
  rootType: IntrospectionType | undefined,
  typeMap: Map<string, IntrospectionType>,
  operationType: "query" | "mutation"
): OperationType[] {
  if (!rootType || !rootType.fields) {
    return [];
  }

  return rootType.fields.map((field) => {
    const { typeName, isList } = unwrapType(field.type);

    const args: ArgumentInfo[] = field.args.map((arg) => {
      const argType = unwrapType(arg.type);
      return {
        name: arg.name,
        typeName: argType.typeName,
        isRequired: argType.isNonNull,
        description: arg.description,
      };
    });

    // For mutations, try to infer affected types
    const affectedTypes =
      operationType === "mutation"
        ? inferAffectedTypes(field.name, typeName, typeMap)
        : [];

    return {
      name: field.name,
      description: field.description,
      returnType: typeName,
      returnsList: isList,
      arguments: args,
      affectedTypes,
    };
  });
}

function inferAffectedTypes(
  mutationName: string,
  returnType: string,
  typeMap: Map<string, IntrospectionType>
): string[] {
  const affected = new Set<string>();

  // Add return type if it's an entity
  const returnTypeInfo = typeMap.get(returnType);
  if (
    returnTypeInfo &&
    returnTypeInfo.kind === "OBJECT" &&
    !BUILT_IN_TYPES.has(returnType)
  ) {
    affected.add(returnType);
  }

  // Try to infer from mutation name patterns
  const lowerName = mutationName.toLowerCase();
  for (const [pattern, extractor] of Object.entries(MUTATION_PATTERNS)) {
    if (lowerName.startsWith(pattern)) {
      const types = extractor(mutationName);
      for (const type of types) {
        if (type && typeMap.has(type)) {
          affected.add(type);
        }
      }
    }
  }

  return [...affected];
}

function extractTypeFromMutation(mutationName: string, prefix: string): string {
  // e.g., "createUser" -> "User", "updatePost" -> "Post"
  const withoutPrefix = mutationName.slice(prefix.length);
  return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
}

// =============================================================================
// RELATIONSHIP BUILDING
// =============================================================================

function buildRelationships(
  entities: EntityType[],
  typeMap: Map<string, IntrospectionType>
): TypeRelationship[] {
  const relationships: TypeRelationship[] = [];
  const entityNames = new Set(entities.map((e) => e.name));

  for (const entity of entities) {
    const type = typeMap.get(entity.name);
    if (!type || !type.fields) continue;

    for (const field of type.fields) {
      const { typeName, isList } = unwrapType(field.type);

      // Check if this field references another entity
      if (entityNames.has(typeName) && typeName !== entity.name) {
        relationships.push({
          from: entity.name,
          to: typeName,
          fieldName: field.name,
          isList,
          direction: "outgoing",
        });
      }
    }
  }

  return relationships;
}

function enrichEntitiesWithRelationships(
  entities: EntityType[],
  relationships: TypeRelationship[]
): void {
  const entityMap = new Map(entities.map((e) => [e.name, e]));

  for (const rel of relationships) {
    // Add to referencedBy for the target entity
    const targetEntity = entityMap.get(rel.to);
    if (targetEntity && !targetEntity.referencedBy.includes(rel.from)) {
      targetEntity.referencedBy.push(rel.from);
    }
  }
}

// =============================================================================
// SCHEMA SUMMARY (for AI prompts)
// =============================================================================

/**
 * Generates a human-readable summary of the analyzed schema.
 * This is useful for AI prompts and debugging.
 */
export function generateSchemaSummary(schema: AnalyzedSchema): string {
  const lines: string[] = [];

  lines.push("# GraphQL Schema Analysis\n");

  // Entities
  lines.push("## Entity Types\n");
  for (const entity of schema.entities) {
    if (entity.characteristics.isRootType) continue;

    lines.push(`### ${entity.name}`);
    if (entity.description) {
      lines.push(`Description: ${entity.description}`);
    }

    lines.push(`- Has ID: ${entity.hasId}`);
    lines.push(`- Fields: ${entity.fields.map((f) => f.name).join(", ")}`);

    if (entity.references.length > 0) {
      lines.push(`- References: ${entity.references.join(", ")}`);
    }
    if (entity.referencedBy.length > 0) {
      lines.push(`- Referenced by: ${entity.referencedBy.join(", ")}`);
    }

    const chars = entity.characteristics;
    const traits: string[] = [];
    if (chars.isVolatile) traits.push("volatile");
    if (chars.isUserSpecific) traits.push("user-specific");
    if (chars.hasSensitiveFields) traits.push("has-sensitive-data");
    if (chars.isCollection) traits.push("collection");

    if (traits.length > 0) {
      lines.push(`- Characteristics: ${traits.join(", ")}`);
    }

    lines.push("");
  }

  // Queries
  lines.push("## Query Operations\n");
  for (const query of schema.queries) {
    const args = query.arguments.map((a) => `${a.name}: ${a.typeName}`).join(", ");
    const returnStr = query.returnsList
      ? `[${query.returnType}]`
      : query.returnType;
    lines.push(`- ${query.name}(${args}): ${returnStr}`);
  }
  lines.push("");

  // Mutations
  if (schema.mutations.length > 0) {
    lines.push("## Mutation Operations\n");
    for (const mutation of schema.mutations) {
      const args = mutation.arguments
        .map((a) => `${a.name}: ${a.typeName}`)
        .join(", ");
      const returnStr = mutation.returnsList
        ? `[${mutation.returnType}]`
        : mutation.returnType;
      lines.push(`- ${mutation.name}(${args}): ${returnStr}`);
      if (mutation.affectedTypes.length > 0) {
        lines.push(`  Affects: ${mutation.affectedTypes.join(", ")}`);
      }
    }
    lines.push("");
  }

  // Relationships
  if (schema.relationships.length > 0) {
    lines.push("## Type Relationships\n");
    for (const rel of schema.relationships) {
      const arrow = rel.isList ? "->>" : "->";
      lines.push(`- ${rel.from} ${arrow} ${rel.to} (via ${rel.fieldName})`);
    }
  }

  return lines.join("\n");
}
