import type { ElementTarget } from "vscode-custom-editor-harness";
import { childTarget, element, segmentSelector } from "./private";

export type ResizeHandleSide = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
export type ViewName = "Shiny" | "Mermaid";

export interface ButtonChildren {
  button(label: string): ElementTarget;
}

export interface ItemChildren {
  item(name: string): ElementTarget;
}

export interface ResizeChildren {
  resizeHandle(side: ResizeHandleSide): ElementTarget;
}

export interface ColorSelectTarget extends ElementTarget {
  option(name: string): ElementTarget;
}

export interface PaneChildren extends ButtonChildren {
  field(label: string): ElementTarget;
  colorSelect(label: string): ColorSelectTarget;
  savedStyle(name: string): ElementTarget;
}

export function withButtons<T extends ElementTarget>(target: T): T & ButtonChildren {
  return Object.assign(target, {
    button: (label: string) => childTarget(target, "button", label),
  });
}

export function withItems<T extends ElementTarget>(target: T): T & ItemChildren {
  return Object.assign(target, {
    item: (name: string) => childTarget(target, "item", name),
  });
}

export function withResizeHandles<T extends ElementTarget>(target: T): T & ResizeChildren {
  return Object.assign(target, {
    resizeHandle: (side: ResizeHandleSide) => childTarget(target, "resize-handle", side),
  });
}

export function withPaneChildren<T extends ElementTarget>(target: T): T & PaneChildren {
  return Object.assign(withButtons(target), {
    field: (label: string) => childTarget(target, "field", label),
    colorSelect: (label: string): ColorSelectTarget => {
      const select = childTarget(target, "color-select", label);
      return Object.assign(select, {
        option: (name: string) =>
          element((root) =>
            select
              .locate(root)
              .locator("xpath=parent::*")
              .locator(segmentSelector("option", [name]))
          ),
      });
    },
    savedStyle: (name: string) => childTarget(target, "saved-style", name),
  });
}
