import type { ElementTarget, Locator } from "vscode-custom-editor-harness";

export type Locate = (root: Locator) => Locator;

export function rootTarget(role: string, ...arguments_: readonly string[]): ElementTarget {
  return element((root) => root.locator(segmentSelector(role, arguments_)));
}

export function childTarget(
  parent: ElementTarget,
  role: string,
  ...arguments_: readonly string[]
): ElementTarget {
  return element((root) => parent.locate(root).locator(segmentSelector(role, arguments_)));
}

export function element(locate: Locate): ElementTarget {
  return { kind: "element", locate };
}

export function segmentSelector(role: string, arguments_: readonly string[]): string {
  return `[data-target-role=${cssString(role)}][data-target-name=${cssString(encodeName(arguments_))}]`;
}

function encodeName(arguments_: readonly string[]): string {
  if (arguments_.length === 0) return "";
  if (arguments_.length === 1) return arguments_[0] ?? "";
  return JSON.stringify(arguments_);
}

function cssString(value: string): string {
  return JSON.stringify(value).replaceAll("\\u0000", "�");
}
