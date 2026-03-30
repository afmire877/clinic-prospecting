import * as vscode from "vscode";
import {
  parseAvroSchema,
  AvroType,
  AvroRecord,
  AvroEnum,
  AvroFixed,
  AvroArray,
  AvroMap,
  AvroField,
  getTypeLabel,
  isNullable,
  unwrapNullable,
} from "./avroParser";
import { isAvroDocument } from "./avroDetector";

type SchemaNode =
  | { kind: "record"; record: AvroRecord }
  | { kind: "field"; field: AvroField; parent: AvroRecord }
  | { kind: "enum"; enumType: AvroEnum }
  | { kind: "symbol"; symbol: string; parent: AvroEnum }
  | { kind: "fixed"; fixed: AvroFixed }
  | { kind: "info"; label: string; detail?: string };

export class SchemaTreeProvider implements vscode.TreeDataProvider<SchemaNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SchemaNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private root: AvroType | null = null;
  private activeEditor: vscode.TextEditor | undefined;

  constructor() {
    this.activeEditor = vscode.window.activeTextEditor;
    this.refresh();

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.isAvroFile(editor.document)) {
        this.activeEditor = editor;
        this.refresh();
      }
    });

    vscode.workspace.onDidChangeTextDocument((e) => {
      if (this.activeEditor && e.document === this.activeEditor.document) {
        this.refresh();
      }
    });
  }

  refresh(): void {
    if (this.activeEditor && this.isAvroFile(this.activeEditor.document)) {
      const parsed = parseAvroSchema(this.activeEditor.document.getText());
      this.root = parsed.root;
    } else {
      this.root = null;
    }
    this._onDidChangeTreeData.fire(undefined);
  }

  private isAvroFile(doc: vscode.TextDocument): boolean {
    return isAvroDocument(doc);
  }

  getTreeItem(element: SchemaNode): vscode.TreeItem {
    switch (element.kind) {
      case "record": {
        const item = new vscode.TreeItem(
          element.record.name,
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.iconPath = new vscode.ThemeIcon("symbol-class");
        item.description = element.record.namespace || "";
        item.tooltip = element.record.doc || `${element.record.type}: ${element.record.name}`;
        item.contextValue = "record";
        return item;
      }
      case "field": {
        const nullable = isNullable(element.field.type);
        const effectiveType = nullable
          ? unwrapNullable(element.field.type)
          : element.field.type;
        const hasChildren = this.fieldHasChildren(effectiveType);
        const item = new vscode.TreeItem(
          element.field.name,
          hasChildren
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None
        );
        item.description = getTypeLabel(effectiveType) + (nullable ? "?" : "");
        item.iconPath = new vscode.ThemeIcon(
          nullable ? "symbol-field" : "symbol-property"
        );
        item.tooltip = element.field.doc || `${element.field.name}: ${getTypeLabel(element.field.type)}`;
        item.contextValue = "field";
        return item;
      }
      case "enum": {
        const item = new vscode.TreeItem(
          element.enumType.name,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        item.iconPath = new vscode.ThemeIcon("symbol-enum");
        item.description = `${element.enumType.symbols.length} values`;
        item.tooltip = element.enumType.doc || `enum: ${element.enumType.name}`;
        return item;
      }
      case "symbol": {
        const item = new vscode.TreeItem(
          element.symbol,
          vscode.TreeItemCollapsibleState.None
        );
        item.iconPath = new vscode.ThemeIcon("symbol-enum-member");
        return item;
      }
      case "fixed": {
        const item = new vscode.TreeItem(
          element.fixed.name,
          vscode.TreeItemCollapsibleState.None
        );
        item.iconPath = new vscode.ThemeIcon("symbol-number");
        item.description = `${element.fixed.size} bytes`;
        return item;
      }
      case "info": {
        const item = new vscode.TreeItem(
          element.label,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = element.detail;
        item.iconPath = new vscode.ThemeIcon("info");
        return item;
      }
    }
  }

  getChildren(element?: SchemaNode): SchemaNode[] {
    if (!element) {
      return this.getRootChildren();
    }

    switch (element.kind) {
      case "record":
        return element.record.fields.map((f) => ({
          kind: "field" as const,
          field: f,
          parent: element.record,
        }));

      case "field": {
        const nullable = isNullable(element.field.type);
        const effectiveType = nullable
          ? unwrapNullable(element.field.type)
          : element.field.type;
        return this.getTypeChildren(effectiveType);
      }

      case "enum":
        return element.enumType.symbols.map((s) => ({
          kind: "symbol" as const,
          symbol: s,
          parent: element.enumType,
        }));

      default:
        return [];
    }
  }

  private getRootChildren(): SchemaNode[] {
    if (!this.root) {
      return [
        {
          kind: "info",
          label: "Open an .avsc file to see its schema",
        },
      ];
    }

    return this.getTypeChildren(this.root);
  }

  private getTypeChildren(type: AvroType): SchemaNode[] {
    if (typeof type === "string") {
      return [];
    }

    if (Array.isArray(type)) {
      const nodes: SchemaNode[] = [];
      for (const t of type) {
        nodes.push(...this.getTypeChildren(t));
      }
      return nodes;
    }

    if (typeof type === "object" && type !== null) {
      const obj = type as Record<string, unknown>;

      if (obj.type === "record" || obj.type === "error") {
        return [{ kind: "record", record: type as AvroRecord }];
      }
      if (obj.type === "enum") {
        return [{ kind: "enum", enumType: type as AvroEnum }];
      }
      if (obj.type === "fixed") {
        return [{ kind: "fixed", fixed: type as AvroFixed }];
      }
      if (obj.type === "array") {
        return this.getTypeChildren((type as AvroArray).items);
      }
      if (obj.type === "map") {
        return this.getTypeChildren((type as AvroMap).values);
      }
    }

    return [];
  }

  private fieldHasChildren(type: AvroType): boolean {
    if (typeof type === "string") {
      return false;
    }
    if (Array.isArray(type)) {
      return type.some((t) => this.fieldHasChildren(t));
    }
    if (typeof type === "object" && type !== null) {
      const obj = type as Record<string, unknown>;
      if (obj.type === "record" || obj.type === "error" || obj.type === "enum") {
        return true;
      }
      if (obj.type === "array") {
        return this.fieldHasChildren((type as AvroArray).items);
      }
      if (obj.type === "map") {
        return this.fieldHasChildren((type as AvroMap).values);
      }
    }
    return false;
  }
}
