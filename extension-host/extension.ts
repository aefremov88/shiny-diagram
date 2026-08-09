/**
 * @fileoverview Registers the Shiny custom text editor and its open command.
 */

import * as vscode from "vscode";
import { DiagramEditorProvider } from "./webviewProvider";

const DIAGRAM_VIEW_TYPE = "shiny.diagram";

/**
 * Activates the extension and registers its commands.
 */
export function activate(context: vscode.ExtensionContext): void {
  const provider = new DiagramEditorProvider(context);
  const providerRegistration = vscode.window.registerCustomEditorProvider(
    DIAGRAM_VIEW_TYPE,
    provider,
    { webviewOptions: { retainContextWhenHidden: false } }
  );
  const openDiagramCommand = vscode.commands.registerCommand(
    "shiny.openDiagram",
    async (resource?: vscode.Uri) => {
      const uri = resource ?? vscode.window.activeTextEditor?.document.uri;
      if (!uri) return;

      await vscode.commands.executeCommand("vscode.openWith", uri, DIAGRAM_VIEW_TYPE, {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: false,
        preview: false,
      });
    }
  );
  const exportPngCommand = vscode.commands.registerCommand("shiny.exportPng", () => {
    provider.requestPngExport();
  });

  context.subscriptions.push(providerRegistration, openDiagramCommand, exportPngCommand);
}
