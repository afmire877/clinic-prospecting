# Avro Schema Viewer

A VS Code extension that makes Apache Avro schemas (`.avsc` files) beautiful and readable.

## Features

### Schema Preview
Open any `.avsc` file and click the preview icon in the editor title bar (or run **Avro: Open Schema Preview to the Side**). You get a rich, interactive view with:

- **Collapsible nested records** — expand/collapse with a click
- **Color-coded types** — primitives, records, enums, logical types, and containers each get distinct colors
- **Field table** — every field shows its name, type, default value, and documentation
- **Required/optional badges** — nullable union types are clearly marked
- **Inline nested records** — nested record and enum definitions render right below their parent field
- **Live updates** — the preview updates as you edit the schema
- **Keyboard shortcut** — `Ctrl+Shift+E` to expand/collapse all blocks

### Schema Outline (Sidebar)
A tree view in the Activity Bar that shows the schema hierarchy:
- Records with their fields
- Enums with their symbols
- Nested types expandable in-place
- Automatically tracks the active `.avsc` file

### Syntax Highlighting
Avro-aware TextMate grammar that highlights:
- Avro keywords (`type`, `name`, `namespace`, `fields`, `symbols`, etc.)
- Type declarations (`record`, `enum`, `fixed`, `array`, `map`)
- Primitive types (`null`, `boolean`, `int`, `long`, `float`, `double`, `bytes`, `string`)
- Documentation strings (`doc` values shown as comments)
- Logical types (`logicalType` values)

## Usage

1. Install the extension
2. Open any `.avsc` file
3. Click the preview icon in the editor title bar, or run `Avro: Open Schema Preview to the Side` from the command palette

## Development

```bash
npm install
npm run watch    # dev mode with auto-rebuild
npm run build    # production build
```

## Sample

See `samples/user-event.avsc` for a comprehensive example schema that exercises all features.
