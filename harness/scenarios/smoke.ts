/**
 * @fileoverview Verifies that Shiny opens a fixture in a real VS Code webview.
 */
import { openWith, screenshot } from "vscode-custom-editor-harness";

await openWith("../fixtures/shop.mmd", "shiny.diagram");
await screenshot("smoke");
console.log("smoke ok");
