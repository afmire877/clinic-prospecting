import * as vscode from "vscode";
import { SchemaWebviewProvider } from "./schemaWebview";
import { SchemaTreeProvider } from "./schemaTreeView";
import { isAvroDocument } from "./avroDetector";

export function activate(context: vscode.ExtensionContext) {
  const webviewProvider = new SchemaWebviewProvider(context.extensionUri);
  const treeProvider = new SchemaTreeProvider();

  // Register tree view
  vscode.window.createTreeView("avroSchemaOutline", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("avroSchemaViewer.openPreview", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isAvroDocument(editor.document)) {
        webviewProvider.openPreview(editor.document, false);
      } else {
        vscode.window.showWarningMessage(
          "Open an .avsc or .json file containing an Avro schema to preview it."
        );
      }
    }),

    vscode.commands.registerCommand("avroSchemaViewer.openPreviewToSide", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isAvroDocument(editor.document)) {
        webviewProvider.openPreview(editor.document, true);
      } else {
        vscode.window.showWarningMessage(
          "Open an .avsc or .json file containing an Avro schema to preview it."
        );
      }
    })
  );

  // Refresh tree when relevant files are opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (isAvroDocument(doc)) {
        treeProvider.refresh();
      }
    })
  );
}

export function deactivate() {}
