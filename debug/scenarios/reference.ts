/**
 * @fileoverview Reference scenario for the Shiny debugging harness.
 * Exercises representative roots and descendants from the semantic target tree
 * against a real Shiny custom editor.
 */
import {
  openWith,
  click,
  doubleClick,
  drag,
  type,
  press,
  at,
  exists,
  readSource,
  runCommand,
  screenshot,
} from "vscode-custom-editor-harness";
import { classBox, edge, editPane, shell, toolPane } from "../targets";

await openWith("../fixtures/shop.mmd", "shiny.diagram");

if (!(await exists(shell())) || !(await exists(shell().viewToggle("Shiny")))) {
  throw new Error("Shiny shell did not resolve");
}
if (!(await exists(toolPane().tool("Class")))) {
  throw new Error("tool pane did not resolve");
}

const order = classBox("Order");
await click(order);

await drag(order.resizeHandle("e"), at(640, 220));

await click(edge("Order", "Customer"));
await drag(edge("Order", "Customer").targetEndpoint(), classBox("Invoice"));

await doubleClick(order.member("total: number"));
await press("Control+A");
await type("totalAmount: number");
await press("Enter");

await click(editPane().colorSelect("Fill"));
await click(editPane().colorSelect("Fill").option("Orange"));

if (!(await exists(order.member("totalAmount: number")))) {
  throw new Error("rename did not land in the rendered box");
}

const source = await readSource();
if (!source.includes("totalAmount: number") || !source.includes("Order --> Invoice")) {
  throw new Error(`expected source edits were not visible through readSource():\n${source}`);
}

const markCommand = runCommand("shiny.mark");
await type("reference-scenario");
await press("Enter");
await markCommand;
const screenshotPath = await screenshot("reference-after-edit");
console.log(source);
console.log(`screenshot: ${screenshotPath}`);
