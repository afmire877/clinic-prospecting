import * as vscode from "vscode";

const AVRO_RECORD_TYPES = new Set(["record", "error", "enum", "fixed"]);

/**
 * Checks if a document is an Avro schema file.
 * Matches .avsc files directly, and .json files whose content
 * looks like an Avro schema (top-level "type" is record/error/enum/fixed).
 */
export function isAvroDocument(doc: vscode.TextDocument): boolean {
  if (doc.fileName.endsWith(".avsc") || doc.languageId === "avsc") {
    return true;
  }

  if (doc.fileName.endsWith(".json") || doc.languageId === "json") {
    return looksLikeAvroSchema(doc.getText());
  }

  return false;
}

/**
 * Quick heuristic check on raw text to detect Avro schemas
 * without fully parsing deeply nested JSON.
 */
export function looksLikeAvroSchema(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return AVRO_RECORD_TYPES.has(parsed.type) && typeof parsed.name === "string";
    }
    // Array of schemas (e.g. protocol-style)
    if (Array.isArray(parsed)) {
      return parsed.length > 0 && AVRO_RECORD_TYPES.has(parsed[0]?.type);
    }
  } catch {
    // not valid JSON
  }
  return false;
}
