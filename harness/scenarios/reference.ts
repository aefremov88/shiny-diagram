// @ts-nocheck
/* eslint-disable */
/**
 * @fileoverview Reference scenario for the Shiny debugging harness.
 * This is the syntax specification: target functions, nesting, and gestures
 * are shown here in their intended form. Implementation follows this file.
 *
 * Grammar:
 * - Root targets:   classBox(name), edge(from, to), editPane()
 * - Nested targets: methods on their container, e.g. classBox(n).member(text)
 * - Closed sets:    two values -> methods (targetEndpoint/sourceEndpoint);
 *                   larger sets -> typed union argument (resizeHandle side:
 *                   "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw")
 * - Names are what the source and screen show: class identifiers,
 *   rendered member text, visible button labels.
 *
 * @ts-nocheck and eslint-disable come off once the harness wiring lands
 * and this file compiles against the real target library.
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
  screenshot,
} from "vscode-custom-editor-harness";
import { classBox, edge, editPane } from "../targets";

await openWith("./fixtures/shop.mmd", "shiny.diagram");

// Select a class; the edit pane shows it.
const order = classBox("Order");
await click(order);

// Nested target: resize handle inside the class box (side is a typed union).
await drag(order.resizeHandle("e"), at(640, 220));

// Edge, addressed by its endpoints as written in the source.
await click(edge("Order", "Customer"));

// Retarget the edge: drag its target endpoint onto another class.
await drag(edge("Order", "Customer").targetEndpoint(), classBox("Invoice"));

// Edit a member: double-click enters inline editing; name is the rendered text.
await doubleClick(order.member("total: number"));
await type("totalAmount: number");
await press("Enter");

// Chrome button in the edit pane, by visible label.
await click(editPane().button("Add attribute"));

// Multi-step chrome selector: open it, then pick an option — two plain clicks.
// colorSelect takes the field label, since a pane can hold several (fill,
// stroke, text). An option's name is the preset name ("Amber") or, for
// colors already used in the diagram, the raw color value ("#f59e0b").
await click(editPane().colorSelect("Fill"));
await click(editPane().colorSelect("Fill").option("Amber"));

// Verify on screen, then in the source.
if (!(await exists(order.member("totalAmount: number")))) {
  throw new Error("rename did not land in the rendered box");
}
await screenshot("after-edit");
console.log(await readSource());
// Expected in source: member totalAmount, edge Order -> Invoice, amber style on Order.
