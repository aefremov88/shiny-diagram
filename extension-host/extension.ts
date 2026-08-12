/**
 * @fileoverview Registers the Shiny custom text editor and its open command.
 */

import * as vscode from "vscode";
import { DiagramEditorProvider } from "./webviewProvider";
import { SessionLog } from "./sessionLog";

const DIAGRAM_VIEW_TYPE = "shiny.diagram";

/**
 * Activates the extension and registers its commands.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const log = new SessionLog(vscode.workspace.workspaceFolders?.[0]);
  await log.initialize();
  const provider = new DiagramEditorProvider(context, log);
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
  const markCommand = vscode.commands.registerCommand("shiny.mark", async () => {
    const mark = await vscode.window.showInputBox({
      title: "Shiny: Mark",
      prompt: "Add a debugging note to the current Shiny session log",
    });
    if (mark !== undefined) log.logUserMark(mark);
  });

  context.subscriptions.push(
    providerRegistration,
    openDiagramCommand,
    exportPngCommand,
    markCommand
  );
}
