import type { ElementTarget } from "vscode-custom-editor-harness";
import { childTarget, element, rootTarget, segmentSelector } from "./private";
import { withButtons, withResizeHandles } from "./shared";
import type { ButtonChildren, ResizeChildren } from "./shared";

export interface MemberTarget extends ElementTarget {
  emphasis(name: "Underline" | "Italic"): ElementTarget;
}

export interface ClassBoxTarget extends ElementTarget, ButtonChildren, ResizeChildren {
  stereotype(): ElementTarget;
  header(): ElementTarget;
  member(text: string): MemberTarget;
}

export interface EdgeTarget extends ElementTarget {
  sourceEndpoint(): ElementTarget;
  targetEndpoint(): ElementTarget;
  label(): ElementTarget;
}

export interface NoteTarget extends ElementTarget, ResizeChildren {
  text(): ElementTarget;
}

export interface NamespaceTarget extends ElementTarget {
  header(): ElementTarget;
}

export function classBox(name: string): ClassBoxTarget {
  const target = withButtons(withResizeHandles(rootTarget("class-box", name)));
  return Object.assign(target, {
    stereotype: () => childTarget(target, "stereotype"),
    header: () => childTarget(target, "header"),
    member: (text: string): MemberTarget => {
      const member = childTarget(target, "member", text);
      return Object.assign(member, {
        emphasis: (name: "Underline" | "Italic") => childTarget(member, "emphasis", name),
      });
    },
  });
}

export function edge(from: string, to: string): EdgeTarget {
  const target = rootTarget("edge", from, to);
  return Object.assign(target, {
    sourceEndpoint: () => endpoint(from, to, "source"),
    targetEndpoint: () => endpoint(from, to, "target"),
    label: () => childTarget(target, "label"),
  });
}

export function note(text: string): NoteTarget {
  const target = withResizeHandles(rootTarget("note", text));
  return Object.assign(target, { text: () => childTarget(target, "text") });
}

export function namespace(path: string): NamespaceTarget {
  const target = rootTarget("namespace", path);
  return Object.assign(target, { header: () => childTarget(target, "header") });
}

function endpoint(from: string, to: string, side: "source" | "target"): ElementTarget {
  const edgeSelector = segmentSelector("edge", [from, to]);
  const semanticEndpoint = segmentSelector(`${side}-endpoint`, []);
  return element((root) =>
    root.locator(
      `g.react-flow__edge:has(> ${edgeSelector}:has(${semanticEndpoint})) > .react-flow__edgeupdater-${side}`
    )
  );
}
