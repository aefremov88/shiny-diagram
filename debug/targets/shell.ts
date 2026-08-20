import type { ElementTarget } from "vscode-custom-editor-harness";
import { childTarget, rootTarget } from "./private";
import { withButtons, withItems } from "./shared";
import type { ButtonChildren, ItemChildren, ViewName } from "./shared";

export interface ShellTarget extends ElementTarget, ButtonChildren {
  viewToggle(view: ViewName): ElementTarget;
  status(): ElementTarget;
}

export function shell(): ShellTarget {
  const target = rootTarget("shell");
  return Object.assign(withButtons(target), {
    viewToggle: (view: ViewName) => childTarget(target, "view-toggle", view),
    status: () => childTarget(target, "status"),
  });
}

export function problemList(): ElementTarget & ItemChildren {
  return withItems(rootTarget("problem-list"));
}

export function missingAnnotations(): ElementTarget & ItemChildren {
  return withItems(rootTarget("missing-annotations"));
}
