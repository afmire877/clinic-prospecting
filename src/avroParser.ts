export interface AvroField {
  name: string;
  doc?: string;
  type: AvroType;
  default?: unknown;
  order?: "ascending" | "descending" | "ignore";
  aliases?: string[];
}

export interface AvroRecord {
  type: "record" | "error";
  name: string;
  namespace?: string;
  doc?: string;
  aliases?: string[];
  fields: AvroField[];
}

export interface AvroEnum {
  type: "enum";
  name: string;
  namespace?: string;
  doc?: string;
  aliases?: string[];
  symbols: string[];
  default?: string;
}

export interface AvroFixed {
  type: "fixed";
  name: string;
  namespace?: string;
  doc?: string;
  aliases?: string[];
  size: number;
}

export interface AvroArray {
  type: "array";
  items: AvroType;
}

export interface AvroMap {
  type: "map";
  values: AvroType;
}

export type AvroPrimitive =
  | "null"
  | "boolean"
  | "int"
  | "long"
  | "float"
  | "double"
  | "bytes"
  | "string";

export type AvroLogicalType = {
  type: AvroPrimitive | AvroFixed;
  logicalType: string;
};

export type AvroUnion = AvroType[];

export type AvroType =
  | AvroPrimitive
  | AvroRecord
  | AvroEnum
  | AvroFixed
  | AvroArray
  | AvroMap
  | AvroLogicalType
  | AvroUnion
  | string; // named type reference

export interface ParsedSchema {
  root: AvroType;
  namedTypes: Map<string, AvroRecord | AvroEnum | AvroFixed>;
  errors: string[];
}

const PRIMITIVES = new Set<string>([
  "null", "boolean", "int", "long", "float", "double", "bytes", "string",
]);

export function parseAvroSchema(text: string): ParsedSchema {
  const namedTypes = new Map<string, AvroRecord | AvroEnum | AvroFixed>();
  const errors: string[] = [];

  let root: AvroType;
  try {
    root = JSON.parse(text);
  } catch (e) {
    return {
      root: "null",
      namedTypes,
      errors: [`Invalid JSON: ${(e as Error).message}`],
    };
  }

  collectNamedTypes(root, namedTypes, errors);

  return { root, namedTypes, errors };
}

function collectNamedTypes(
  type: AvroType,
  namedTypes: Map<string, AvroRecord | AvroEnum | AvroFixed>,
  errors: string[]
): void {
  if (type === null || type === undefined) {
    return;
  }

  if (typeof type === "string") {
    return; // primitive or reference
  }

  if (Array.isArray(type)) {
    for (const t of type) {
      collectNamedTypes(t, namedTypes, errors);
    }
    return;
  }

  if (typeof type === "object") {
    const obj = type as Record<string, unknown>;

    if (obj.type === "record" || obj.type === "error") {
      const rec = type as AvroRecord;
      if (rec.name) {
        const fullName = rec.namespace ? `${rec.namespace}.${rec.name}` : rec.name;
        namedTypes.set(fullName, rec);
        namedTypes.set(rec.name, rec);
      }
      if (rec.fields) {
        for (const field of rec.fields) {
          collectNamedTypes(field.type, namedTypes, errors);
        }
      }
    } else if (obj.type === "enum") {
      const en = type as AvroEnum;
      if (en.name) {
        const fullName = en.namespace ? `${en.namespace}.${en.name}` : en.name;
        namedTypes.set(fullName, en);
        namedTypes.set(en.name, en);
      }
    } else if (obj.type === "fixed") {
      const fix = type as AvroFixed;
      if (fix.name) {
        const fullName = fix.namespace ? `${fix.namespace}.${fix.name}` : fix.name;
        namedTypes.set(fullName, fix);
        namedTypes.set(fix.name, fix);
      }
    } else if (obj.type === "array") {
      collectNamedTypes((type as AvroArray).items, namedTypes, errors);
    } else if (obj.type === "map") {
      collectNamedTypes((type as AvroMap).values, namedTypes, errors);
    } else if (obj.logicalType) {
      // logical type — check inner type
      if (typeof obj.type === "object") {
        collectNamedTypes(obj.type as AvroType, namedTypes, errors);
      }
    }
  }
}

export function isPrimitive(type: string): boolean {
  return PRIMITIVES.has(type);
}

export function getTypeLabel(type: AvroType): string {
  if (typeof type === "string") {
    return type;
  }
  if (Array.isArray(type)) {
    return type.map(getTypeLabel).join(" | ");
  }
  if (typeof type === "object" && type !== null) {
    const obj = type as Record<string, unknown>;
    if (obj.logicalType) {
      return `${obj.logicalType}`;
    }
    if (obj.type === "array") {
      return `array<${getTypeLabel((type as AvroArray).items)}>`;
    }
    if (obj.type === "map") {
      return `map<${getTypeLabel((type as AvroMap).values)}>`;
    }
    if (obj.type === "record" || obj.type === "error") {
      return (type as AvroRecord).name;
    }
    if (obj.type === "enum") {
      return (type as AvroEnum).name;
    }
    if (obj.type === "fixed") {
      return `${(type as AvroFixed).name} (${(type as AvroFixed).size} bytes)`;
    }
  }
  return "unknown";
}

export function isNullable(type: AvroType): boolean {
  if (Array.isArray(type)) {
    return type.some((t) => t === "null");
  }
  return type === "null";
}

export function unwrapNullable(type: AvroType): AvroType {
  if (Array.isArray(type)) {
    const nonNull = type.filter((t) => t !== "null");
    if (nonNull.length === 1) {
      return nonNull[0];
    }
    return nonNull;
  }
  return type;
}
