import * as vscode from "vscode";
import { SchemaWebviewProvider } from "./schemaWebview";
import { SchemaTreeProvider } from "./schemaTreeView";

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
      if (editor && isAvscDocument(editor.document)) {
        webviewProvider.openPreview(editor.document, false);
      } else {
        vscode.window.showWarningMessage("Open an .avsc file to preview its schema.");
      }
    }),

    vscode.commands.registerCommand("avroSchemaViewer.openPreviewToSide", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isAvscDocument(editor.document)) {
        webviewProvider.openPreview(editor.document, true);
      } else {
        vscode.window.showWarningMessage("Open an .avsc file to preview its schema.");
      }
    })
  );

  // Auto-open preview when an .avsc file is opened (optional, triggered by command)
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (isAvscDocument(doc)) {
        treeProvider.refresh();
      }
    })
  );
}

function isAvscDocument(doc: vscode.TextDocument): boolean {
  return doc.fileName.endsWith(".avsc") || doc.languageId === "avsc";
}

export function deactivate() {}
