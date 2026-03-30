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
  AvroLogicalType,
  getTypeLabel,
  isNullable,
  unwrapNullable,
  isPrimitive,
} from "./avroParser";

export class SchemaWebviewProvider {
  private static readonly viewType = "avroSchemaViewer.preview";
  private panels = new Map<string, vscode.WebviewPanel>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  openPreview(document: vscode.TextDocument, toSide: boolean = false) {
    const key = document.uri.toString();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal();
      this.updatePanel(existing, document);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      SchemaWebviewProvider.viewType,
      `Avro: ${this.getFileName(document.uri)}`,
      toSide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    this.panels.set(key, panel);
    this.updatePanel(panel, document);

    panel.onDidDispose(() => {
      this.panels.delete(key);
    });

    // Live update on document change
    const changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === key) {
        this.updatePanel(panel, e.document);
      }
    });
    panel.onDidDispose(() => changeListener.dispose());
  }

  private updatePanel(panel: vscode.WebviewPanel, document: vscode.TextDocument) {
    const text = document.getText();
    const parsed = parseAvroSchema(text);
    panel.webview.html = this.getHtml(parsed.root, parsed.errors, panel.webview);
  }

  private getFileName(uri: vscode.Uri): string {
    const parts = uri.path.split("/");
    return parts[parts.length - 1];
  }

  private getHtml(
    root: AvroType,
    errors: string[],
    _webview: vscode.Webview
  ): string {
    const body = errors.length > 0
      ? `<div class="error-banner">${errors.map((e) => this.esc(e)).join("<br>")}</div>`
      : this.renderType(root, 0);

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avro Schema Preview</title>
  <style>${this.getCss()}</style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
  <script>${this.getJs()}</script>
</body>
</html>`;
  }

  private renderType(type: AvroType, depth: number): string {
    if (typeof type === "string") {
      return this.renderPrimitiveInline(type);
    }

    if (Array.isArray(type)) {
      return this.renderUnion(type, depth);
    }

    if (typeof type === "object" && type !== null) {
      const obj = type as Record<string, unknown>;
      if (obj.type === "record" || obj.type === "error") {
        return this.renderRecord(type as AvroRecord, depth);
      }
      if (obj.type === "enum") {
        return this.renderEnum(type as AvroEnum);
      }
      if (obj.type === "fixed") {
        return this.renderFixed(type as AvroFixed);
      }
      if (obj.type === "array") {
        return this.renderArray(type as AvroArray, depth);
      }
      if (obj.type === "map") {
        return this.renderMap(type as AvroMap, depth);
      }
      if (obj.logicalType) {
        return this.renderLogicalType(type as AvroLogicalType);
      }
    }

    return `<span class="type-unknown">unknown</span>`;
  }

  private renderRecord(record: AvroRecord, depth: number): string {
    const namespace = record.namespace
      ? `<span class="namespace">${this.esc(record.namespace)}</span>`
      : "";
    const doc = record.doc
      ? `<p class="doc">${this.esc(record.doc)}</p>`
      : "";
    const badge = record.type === "error"
      ? `<span class="badge badge-error">error</span>`
      : `<span class="badge badge-record">record</span>`;
    const aliases = record.aliases?.length
      ? `<span class="aliases">aliases: ${record.aliases.map((a) => this.esc(a)).join(", ")}</span>`
      : "";
    const collapsed = depth > 0 ? "collapsed" : "";

    const fields = record.fields
      .map((f) => this.renderField(f, depth + 1))
      .join("");

    return /* html */ `
<div class="schema-block record-block depth-${Math.min(depth, 4)} ${collapsed}" data-depth="${depth}">
  <div class="block-header" onclick="toggleBlock(this)">
    <span class="collapse-icon"></span>
    ${badge}
    <span class="type-name">${this.esc(record.name)}</span>
    ${namespace}
    ${aliases}
    <span class="field-count">${record.fields.length} field${record.fields.length !== 1 ? "s" : ""}</span>
  </div>
  ${doc}
  <div class="block-body">
    <table class="fields-table">
      <thead>
        <tr>
          <th class="col-name">Field</th>
          <th class="col-type">Type</th>
          <th class="col-default">Default</th>
          <th class="col-doc">Description</th>
        </tr>
      </thead>
      <tbody>
        ${fields}
      </tbody>
    </table>
  </div>
</div>`;
  }

  private renderField(field: AvroField, depth: number): string {
    const nullable = isNullable(field.type);
    const effectiveType = nullable ? unwrapNullable(field.type) : field.type;
    const typeLabel = this.renderFieldType(effectiveType, depth);
    const optionalBadge = nullable
      ? `<span class="badge badge-optional">optional</span>`
      : `<span class="badge badge-required">required</span>`;
    const defaultVal =
      field.default !== undefined
        ? `<code class="default-value">${this.esc(JSON.stringify(field.default))}</code>`
        : `<span class="no-default">—</span>`;
    const doc = field.doc
      ? this.esc(field.doc)
      : `<span class="no-doc">—</span>`;

    // Check if this field has a nested record that needs rendering
    const nestedBlock = this.getNestedBlock(effectiveType, depth);

    return /* html */ `
<tr class="field-row">
  <td class="col-name">
    <span class="field-name">${this.esc(field.name)}</span>
    ${optionalBadge}
  </td>
  <td class="col-type">${typeLabel}</td>
  <td class="col-default">${defaultVal}</td>
  <td class="col-doc">${doc}</td>
</tr>
${nestedBlock ? `<tr class="nested-row"><td colspan="4">${nestedBlock}</td></tr>` : ""}`;
  }

  private renderFieldType(type: AvroType, _depth: number): string {
    if (typeof type === "string") {
      const cls = isPrimitive(type) ? "type-primitive" : "type-reference";
      return `<span class="${cls}">${this.esc(type)}</span>`;
    }

    if (Array.isArray(type)) {
      const parts = type
        .filter((t) => t !== "null")
        .map((t) => this.renderFieldType(t, _depth));
      return parts.join(`<span class="type-separator"> | </span>`);
    }

    if (typeof type === "object" && type !== null) {
      const obj = type as Record<string, unknown>;

      if (obj.logicalType) {
        return `<span class="type-logical">${this.esc(String(obj.logicalType))}</span>`;
      }
      if (obj.type === "array") {
        return `<span class="type-container">array</span>&lt;${this.renderFieldType((type as AvroArray).items, _depth)}&gt;`;
      }
      if (obj.type === "map") {
        return `<span class="type-container">map</span>&lt;${this.renderFieldType((type as AvroMap).values, _depth)}&gt;`;
      }
      if (obj.type === "record" || obj.type === "error") {
        return `<span class="type-record">${this.esc((type as AvroRecord).name)}</span>`;
      }
      if (obj.type === "enum") {
        return `<span class="type-enum">${this.esc((type as AvroEnum).name)}</span>`;
      }
      if (obj.type === "fixed") {
        return `<span class="type-fixed">${this.esc((type as AvroFixed).name)}</span>`;
      }
    }

    return `<span class="type-unknown">${this.esc(getTypeLabel(type))}</span>`;
  }

  private getNestedBlock(type: AvroType, depth: number): string | null {
    // Unwrap arrays and maps to find nested complex types
    if (typeof type === "object" && type !== null && !Array.isArray(type)) {
      const obj = type as Record<string, unknown>;
      if (obj.type === "record" || obj.type === "error") {
        return this.renderRecord(type as AvroRecord, depth);
      }
      if (obj.type === "enum") {
        return this.renderEnum(type as AvroEnum);
      }
      if (obj.type === "array") {
        return this.getNestedBlock((type as AvroArray).items, depth);
      }
      if (obj.type === "map") {
        return this.getNestedBlock((type as AvroMap).values, depth);
      }
    }

    if (Array.isArray(type)) {
      for (const t of type) {
        const nested = this.getNestedBlock(t, depth);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  private renderEnum(en: AvroEnum): string {
    const doc = en.doc ? `<p class="doc">${this.esc(en.doc)}</p>` : "";
    const symbols = en.symbols
      .map((s) => `<span class="enum-symbol">${this.esc(s)}</span>`)
      .join("");

    return /* html */ `
<div class="schema-block enum-block">
  <div class="block-header" onclick="toggleBlock(this)">
    <span class="collapse-icon"></span>
    <span class="badge badge-enum">enum</span>
    <span class="type-name">${this.esc(en.name)}</span>
  </div>
  ${doc}
  <div class="block-body">
    <div class="enum-symbols">${symbols}</div>
  </div>
</div>`;
  }

  private renderFixed(fixed: AvroFixed): string {
    const doc = fixed.doc ? `<p class="doc">${this.esc(fixed.doc)}</p>` : "";
    return /* html */ `
<div class="schema-block fixed-block">
  <div class="block-header">
    <span class="badge badge-fixed">fixed</span>
    <span class="type-name">${this.esc(fixed.name)}</span>
    <span class="fixed-size">${fixed.size} bytes</span>
  </div>
  ${doc}
</div>`;
  }

  private renderArray(arr: AvroArray, depth: number): string {
    return `<div class="inline-type">array&lt;${this.renderType(arr.items, depth)}&gt;</div>`;
  }

  private renderMap(map: AvroMap, depth: number): string {
    return `<div class="inline-type">map&lt;string, ${this.renderType(map.values, depth)}&gt;</div>`;
  }

  private renderUnion(types: AvroType[], depth: number): string {
    return types.map((t) => this.renderType(t, depth)).join(" | ");
  }

  private renderLogicalType(lt: AvroLogicalType): string {
    return `<span class="type-logical">${this.esc(lt.logicalType)}</span>`;
  }

  private renderPrimitiveInline(type: string): string {
    const cls = isPrimitive(type) ? "type-primitive" : "type-reference";
    return `<span class="${cls}">${this.esc(type)}</span>`;
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private getCss(): string {
    return /* css */ `
      :root {
        --bg: var(--vscode-editor-background);
        --fg: var(--vscode-editor-foreground);
        --border: var(--vscode-panel-border, rgba(128,128,128,0.2));
        --header-bg: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08));
        --hover: var(--vscode-list-hoverBackground, rgba(128,128,128,0.1));
        --accent: var(--vscode-textLink-foreground, #4fc1ff);
        --success: #4ec9b0;
        --warning: #dcdcaa;
        --error: #f44747;
        --purple: #c586c0;
        --orange: #ce9178;
        --blue: #569cd6;
        --green: #6a9955;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
        font-size: var(--vscode-font-size, 13px);
        color: var(--fg);
        background: var(--bg);
        padding: 16px;
        line-height: 1.5;
      }

      .container { max-width: 1100px; margin: 0 auto; }

      .error-banner {
        background: rgba(244, 71, 71, 0.15);
        border: 1px solid var(--error);
        border-radius: 6px;
        padding: 12px 16px;
        color: var(--error);
        font-family: var(--vscode-editor-font-family, monospace);
      }

      /* Schema blocks */
      .schema-block {
        border: 1px solid var(--border);
        border-radius: 8px;
        margin: 8px 0;
        overflow: hidden;
        background: var(--bg);
      }

      .schema-block.depth-1 { margin-left: 0; border-left: 3px solid var(--accent); }
      .schema-block.depth-2 { margin-left: 0; border-left: 3px solid var(--purple); }
      .schema-block.depth-3 { margin-left: 0; border-left: 3px solid var(--warning); }
      .schema-block.depth-4 { margin-left: 0; border-left: 3px solid var(--orange); }

      .block-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: var(--header-bg);
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }

      .block-header:hover { background: var(--hover); }

      .collapse-icon::before {
        content: "▼";
        display: inline-block;
        font-size: 10px;
        transition: transform 0.2s;
        opacity: 0.6;
        width: 14px;
      }

      .collapsed > .block-header .collapse-icon::before {
        transform: rotate(-90deg);
      }

      .collapsed > .block-body,
      .collapsed > .doc { display: none; }

      .type-name {
        font-weight: 600;
        font-size: 1.05em;
        color: var(--accent);
      }

      .namespace {
        font-size: 0.85em;
        opacity: 0.6;
        font-style: italic;
      }

      .namespace::before { content: "("; }
      .namespace::after { content: ")"; }

      .field-count {
        margin-left: auto;
        font-size: 0.8em;
        opacity: 0.5;
      }

      .aliases {
        font-size: 0.8em;
        opacity: 0.5;
      }

      /* Badges */
      .badge {
        padding: 1px 7px;
        border-radius: 4px;
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .badge-record { background: rgba(79, 193, 255, 0.15); color: var(--accent); }
      .badge-error { background: rgba(244, 71, 71, 0.15); color: var(--error); }
      .badge-enum { background: rgba(197, 134, 192, 0.15); color: var(--purple); }
      .badge-fixed { background: rgba(206, 145, 120, 0.15); color: var(--orange); }
      .badge-optional { background: rgba(220, 220, 170, 0.12); color: var(--warning); font-size: 0.7em; }
      .badge-required { background: rgba(78, 201, 176, 0.12); color: var(--success); font-size: 0.7em; }

      /* Documentation */
      .doc {
        padding: 8px 14px;
        font-style: italic;
        opacity: 0.75;
        border-bottom: 1px solid var(--border);
        font-size: 0.9em;
      }

      /* Fields table */
      .block-body { padding: 4px 0; }

      .fields-table {
        width: 100%;
        border-collapse: collapse;
      }

      .fields-table th {
        text-align: left;
        padding: 6px 14px;
        font-size: 0.75em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.5;
        font-weight: 600;
        border-bottom: 1px solid var(--border);
      }

      .fields-table td {
        padding: 8px 14px;
        border-bottom: 1px solid rgba(128,128,128,0.08);
        vertical-align: top;
      }

      .field-row:hover td { background: var(--hover); }

      .col-name { width: 22%; }
      .col-type { width: 28%; }
      .col-default { width: 18%; }
      .col-doc { width: 32%; }

      .field-name {
        font-family: var(--vscode-editor-font-family, monospace);
        font-weight: 600;
        color: var(--fg);
      }

      /* Type colors */
      .type-primitive { color: var(--blue); font-family: var(--vscode-editor-font-family, monospace); }
      .type-reference { color: var(--success); font-family: var(--vscode-editor-font-family, monospace); }
      .type-record { color: var(--accent); font-family: var(--vscode-editor-font-family, monospace); font-weight: 600; }
      .type-enum { color: var(--purple); font-family: var(--vscode-editor-font-family, monospace); }
      .type-fixed { color: var(--orange); font-family: var(--vscode-editor-font-family, monospace); }
      .type-logical { color: var(--warning); font-family: var(--vscode-editor-font-family, monospace); font-style: italic; }
      .type-container { color: var(--blue); font-family: var(--vscode-editor-font-family, monospace); }
      .type-separator { opacity: 0.4; }
      .type-unknown { opacity: 0.5; font-style: italic; }

      .default-value {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.9em;
        background: rgba(128,128,128,0.1);
        padding: 1px 5px;
        border-radius: 3px;
      }

      .no-default, .no-doc { opacity: 0.3; }

      /* Enum symbols */
      .enum-symbols {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 10px 14px;
      }

      .enum-symbol {
        font-family: var(--vscode-editor-font-family, monospace);
        background: rgba(197, 134, 192, 0.1);
        color: var(--purple);
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 0.9em;
        border: 1px solid rgba(197, 134, 192, 0.2);
      }

      .fixed-size {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 0.85em;
        opacity: 0.6;
      }

      /* Nested rows */
      .nested-row td {
        padding: 0 14px 8px 14px !important;
        border-bottom: none !important;
      }

      .nested-row .schema-block { margin: 4px 0 8px 0; }
    `;
  }

  private getJs(): string {
    return /* js */ `
      function toggleBlock(header) {
        const block = header.parentElement;
        block.classList.toggle('collapsed');
      }

      // Allow expanding all with keyboard shortcut
      document.addEventListener('keydown', (e) => {
        if (e.key === 'e' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
          e.preventDefault();
          const blocks = document.querySelectorAll('.schema-block');
          const allExpanded = [...blocks].every(b => !b.classList.contains('collapsed'));
          blocks.forEach(b => {
            if (allExpanded) {
              b.classList.add('collapsed');
            } else {
              b.classList.remove('collapsed');
            }
          });
        }
      });
    `;
  }
}
