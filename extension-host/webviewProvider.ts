/**
 * @fileoverview Resolves Shiny custom text editors and generates their webview HTML.
 */

import * as vscode from "vscode";
import { DiagramSession } from "./diagramSession";

export class DiagramEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly sessions = new Set<DiagramSession>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  /** Resolves one diagram view backed by the supplied text document. */
  resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): void {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "out", "webview")],
    };
    panel.webview.html = getWebviewHtml(this.context, panel.webview, document);

    const session = new DiagramSession(document, panel);
    this.sessions.add(session);
    panel.onDidDispose(() => {
      session.dispose();
      this.sessions.delete(session);
    });
  }

  requestPngExport(): void {
    const activeSession = [...this.sessions].find((session) => session.isActive);
    activeSession?.requestPngExport();
  }
}

/**
 * Builds the full HTML document for the Shiny webview panel.
 */
export function getWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  document: vscode.TextDocument
): string {
  const sourceText = document.getText();

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "webview", "assets", "index.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "out", "webview", "assets", "index.css")
  );

  // Nonce allows only this generated script tag under the webview CSP.
  const nonce = getNonce();
  const initialData = serializeJsonForHtml({
    sourceText,
    documentName: document.uri.path.split("/").at(-1) ?? "",
  });

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; script-src ${webview.cspSource} 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Shiny Diagram</title>
</head>
<body>
  <script id="shiny-initial-data" type="application/json">${initialData}</script>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function serializeJsonForHtml(value: unknown): string {
  const ls = String.fromCharCode(0x2028);
  const ps = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp(ls, "g"), "\\u2028")
    .replace(new RegExp(ps, "g"), "\\u2029");
}
