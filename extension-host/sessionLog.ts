/**
 * @fileoverview Owns the development-session log file and formats host and webview entries.
 */

import * as vscode from "vscode";
import type { WebviewLogEntry } from "./protocol";

const LOG_DIRECTORY = ".shiny";
const LOG_FILE = "session.log";

export class SessionLog {
  private readonly directoryUri: vscode.Uri | null;
  private readonly logUri: vscode.Uri | null;
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(workspaceFolder: vscode.WorkspaceFolder | undefined) {
    this.directoryUri = workspaceFolder
      ? vscode.Uri.joinPath(workspaceFolder.uri, LOG_DIRECTORY)
      : null;
    this.logUri = this.directoryUri ? vscode.Uri.joinPath(this.directoryUri, LOG_FILE) : null;
  }

  /** Clears the prior session and records this extension activation. */
  initialize(): Promise<void> {
    const logUri = this.logUri;
    const directoryUri = this.directoryUri;
    if (!logUri || !directoryUri) return Promise.resolve();
    this.pendingWrite = (async () => {
      await vscode.workspace.fs.createDirectory(directoryUri);
      await vscode.workspace.fs.writeFile(
        logUri,
        Buffer.from(`${toTime()} [HOST] activation\n`, "utf8")
      );
    })();
    return this.pendingWrite;
  }

  /** Records a document opening and its complete initial source. */
  logDocumentOpen(document: vscode.TextDocument): void {
    const sourceLines = document.getText().split(/\r?\n/);
    this.appendLines("HOST", [
      `document-open ${document.uri.fsPath}`,
      "initial-source-begin",
      ...sourceLines,
      "initial-source-end",
    ]);
  }

  /** Records a save of an open Shiny document. */
  logSave(document: vscode.TextDocument): void {
    this.append("HOST", `save ${document.uri.fsPath}`);
  }

  /** Records one structured entry received from the webview. */
  logWebviewEntry(entry: WebviewLogEntry): void {
    this.append(toLayer(entry), formatWebviewEntry(entry));
  }

  /** Records a user-authored debugging mark. */
  logUserMark(mark: string): void {
    this.append("USER", mark.replace(/\r?\n/g, " "));
  }

  private append(layer: LogLayer, content: string): Promise<void> {
    return this.appendLines(layer, [content]);
  }

  private appendLines(layer: LogLayer, lines: readonly string[]): Promise<void> {
    const logUri = this.logUri;
    if (!logUri) return Promise.resolve();
    const bytes = Buffer.from(
      lines.map((line) => `${toTime()} [${layer}] ${line}\n`).join(""),
      "utf8"
    );
    this.pendingWrite = this.pendingWrite.then(async () => {
      const prior = await vscode.workspace.fs.readFile(logUri);
      await vscode.workspace.fs.writeFile(logUri, Buffer.concat([prior, bytes]));
    });
    return this.pendingWrite;
  }
}

type LogLayer = "HOST" | "BEHAVIOR" | "CONTROLLER" | "USER";

function toLayer(entry: WebviewLogEntry): LogLayer {
  return entry.kind === "action" ? "BEHAVIOR" : "CONTROLLER";
}

function formatWebviewEntry(entry: WebviewLogEntry): string {
  switch (entry.kind) {
    case "action": {
      const values = Object.entries(entry.values).map(
        ([name, value]) => `${name}=${String(value)}`
      );
      return ["action", entry.name, entry.target, ...values].join(" ");
    }
    case "dispatch":
      return `dispatch ${JSON.stringify(entry.commands)}`;
    case "edits": {
      const summaries = entry.edits.map(
        (edit) =>
          `${edit.kind}@${edit.startLine}${edit.endLine === edit.startLine ? "" : `-${edit.endLine}`}`
      );
      return `edits count=${entry.count}${summaries.length > 0 ? ` ${summaries.join(" ")}` : ""}`;
    }
    case "failure":
      return `failure ${entry.stage} ${entry.message.replace(/\r?\n/g, " ")}`;
  }
}

function toTime(): string {
  return new Date().toISOString().slice(11, 23);
}
