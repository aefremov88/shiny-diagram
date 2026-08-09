/**
 * @fileoverview PNG export path derivation and file writing.
 */

import * as vscode from "vscode";
import { toPngPath } from "./exportPath";

export async function writeExportedPng(
  documentUri: vscode.Uri,
  base64: string
): Promise<vscode.Uri> {
  const targetUri = vscode.Uri.file(toPngPath(documentUri.fsPath));
  await vscode.workspace.fs.writeFile(targetUri, Buffer.from(base64, "base64"));
  return targetUri;
}
