/**
 * @fileoverview Implements the Shiny target vocabulary specified by
 * ../scenarios/reference.ts.
 */
import type { ElementTarget, Locator } from "vscode-custom-editor-harness";

export type ResizeHandleSide = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export type ClassBoxTarget = ElementTarget & {
  readonly resizeHandle: (side: ResizeHandleSide) => ElementTarget;
  readonly member: (text: string) => ElementTarget;
  readonly button: (label: string) => ElementTarget;
};

export type EdgeTarget = ElementTarget & {
  readonly targetEndpoint: () => ElementTarget;
  readonly sourceEndpoint: () => ElementTarget;
};

export type ColorSelectTarget = ElementTarget & {
  readonly option: (name: string) => ElementTarget;
};

export type EditPaneTarget = ElementTarget & {
  readonly colorSelect: (label: string) => ColorSelectTarget;
};

/** Returns a class box and its addressable descendants. */
export function classBox(name: string): ClassBoxTarget {
  const locate = (root: Locator): Locator => root.locator(targetSelector("class-box", name));
  return {
    kind: "element",
    locate,
    resizeHandle: (side) => descendant(locate, "resize-handle", side),
    member: (text) => descendant(locate, "member", text),
    button: (label) => descendant(locate, "button", label),
  };
}

/** Returns a relationship edge and its React Flow reconnect endpoints. */
export function edge(from: string, to: string): EdgeTarget {
  const edgeSelector = `[data-target-role="edge"][data-target-source=${quotedCssValue(from)}][data-target-target=${quotedCssValue(to)}]`;
  const locate = (root: Locator): Locator => root.locator(edgeSelector);
  const endpoint = (side: "source" | "target"): ElementTarget => ({
    kind: "element",
    locate: (root) =>
      root.locator(`g.react-flow__edge:has(> ${edgeSelector}) > .react-flow__edgeupdater-${side}`),
  });
  return {
    kind: "element",
    locate,
    sourceEndpoint: () => endpoint("source"),
    targetEndpoint: () => endpoint("target"),
  };
}

/** Returns the edit pane and its addressable controls. */
export function editPane(): EditPaneTarget {
  const locate = (root: Locator): Locator => root.locator('[data-target-role="edit-pane"]');
  return {
    kind: "element",
    locate,
    colorSelect: (label) => {
      const selectSelector = targetSelector("color-select", label);
      const locateColorSelect = (root: Locator): Locator => locate(root).locator(selectSelector);
      return {
        kind: "element",
        locate: locateColorSelect,
        option: (name) => ({
          kind: "element",
          locate: (root) =>
            locate(root).locator(
              `div:has(> ${selectSelector}) ${targetSelector("color-option", name)}`
            ),
        }),
      };
    },
  };
}

function descendant(
  locateParent: (root: Locator) => Locator,
  role: string,
  name: string
): ElementTarget {
  return {
    kind: "element",
    locate: (root) => locateParent(root).locator(targetSelector(role, name)),
  };
}

function targetSelector(role: string, name: string): string {
  return `[data-target-role=${quotedCssValue(role)}][data-target-name=${quotedCssValue(name)}]`;
}

function quotedCssValue(value: string): string {
  const escaped = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) return "";
    if (codePoint === 0) return "�";
    if (codePoint <= 31 || codePoint === 127) return `\\${codePoint.toString(16)} `;
    if (character === '"' || character === "\\") return `\\${character}`;
    return character;
  }).join("");
  return `"${escaped}"`;
}
