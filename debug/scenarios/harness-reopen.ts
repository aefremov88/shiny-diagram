/** @fileoverview Reproduces harness frame ambiguity after closing and reopening. */
import * as vscode from "vscode";
import { openWith, runCommand, screenshot, webview } from "vscode-custom-editor-harness";
import { classBox } from "../targets";

await openWith("../fixtures/shop.mmd", "shiny.diagram");
await classBox("Order")
  .locate(await webview())
  .waitFor({ state: "visible", timeout: 5000 });
const document = vscode.workspace.textDocuments.find((item) =>
  item.uri.fsPath.endsWith("shop.mmd")
);
if (!document) throw new Error("Fixture document was not opened");
await runCommand("workbench.action.closeActiveEditor");
await runCommand("vscode.openWith", document.uri, "shiny.diagram");
await classBox("Order")
  .locate(await webview())
  .waitFor({ state: "visible", timeout: 5000 });
await screenshot("reopened");
console.log("PASS reopened frame resolved");
