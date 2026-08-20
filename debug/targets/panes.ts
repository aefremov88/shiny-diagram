import type { ElementTarget } from "vscode-custom-editor-harness";
import { childTarget, rootTarget } from "./private";
import { withPaneChildren } from "./shared";
import type { PaneChildren } from "./shared";

export interface ToolPaneTarget extends ElementTarget {
  tool(name: string): ElementTarget;
}

export type EditPaneTarget = ElementTarget & PaneChildren;

export function toolPane(): ToolPaneTarget {
  const target = rootTarget("tool-pane");
  return Object.assign(target, { tool: (name: string) => childTarget(target, "tool", name) });
}

export function editPane(): EditPaneTarget {
  return withPaneChildren(rootTarget("edit-pane"));
}
