import type { Rect } from "../../../../shared/geometry";
import type { ClassId, NamespaceId, NoteId } from "../../../../shared/ids";

export type ElementId = ClassId | NoteId;
export type ElementKind = "class" | "note";
export type IncrementalElement = {
  readonly id: ElementId;
  readonly kind: ElementKind;
  readonly parentNamespaceId: NamespaceId | null;
  readonly w: number;
  readonly h: number;
};
export type PlacedElement = IncrementalElement & { readonly bounds: Rect };
export type Wish = {
  readonly x: number;
  readonly y: number;
  readonly weight: number;
  readonly flowSide: -1 | 0 | 1;
  readonly anchorFlow: number;
};
