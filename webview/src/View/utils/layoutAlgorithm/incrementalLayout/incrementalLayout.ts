import type { Rect } from "../../../../shared/geometry";
import type { ClassId, NamespaceId, NoteId } from "../../../../shared/ids";
import { INCREMENTAL_LAYOUT_MIN_GAP_RATIO, NAMESPACE_MARGIN } from "../../../config/editorUiConfig";
import type { LayoutInput, SpatialAssignment } from "../layoutContracts";
import {
  estimateClassSize,
  estimateNoteSize,
  estimateUnpositionedClassSize,
  estimateUnpositionedNoteSize,
} from "../sizeEstimation";
import { toAnchorWishes, isHorizontal } from "./anchorWishes";
import { findCandidate } from "./candidateSearch";
import { selectNextElement, type Coupling } from "./placementOrder";
import type { ElementId, IncrementalElement, PlacedElement, Wish } from "./types";

export function incrementalLayout(input: LayoutInput): readonly SpatialAssignment[] {
  const missing = new Set(input.missingClassIds);
  const unplaced = new Map<ElementId, IncrementalElement>();
  input.classes.forEach((item) => {
    if (!missing.has(item.id)) return;
    const size = estimateClassSize(item);
    unplaced.set(item.id, {
      id: item.id,
      kind: "class",
      parentNamespaceId: item.parentNamespaceId,
      ...size,
    });
  });
  input.notes.forEach((item) => {
    if (item.bounds) return;
    const size = estimateNoteSize(item);
    unplaced.set(item.id, { id: item.id, kind: "note", parentNamespaceId: null, ...size });
  });
  const placed = positionedElements(input);
  const coupling = buildCoupling(input);
  const assignments: SpatialAssignment[] = [];
  while (unplaced.size > 0) {
    const id = selectNextElement([...unplaced.keys()], new Set(placed.keys()), coupling);
    const element = required(unplaced.get(id));
    const diagramBounds = unionRects([...placed.values()].map((item) => item.bounds));
    let wishes = toAnchorWishes(element, placed, input, diagramBounds);
    if (wishes.length === 0) wishes = [fallbackWish(element, diagramBounds, input.direction)];
    const hulls = deriveNamespaceHulls(input, placed);
    const ownHull =
      element.kind === "class" && element.parentNamespaceId
        ? (hulls.get(element.parentNamespaceId) ?? null)
        : null;
    const foreignHulls = [...hulls.entries()]
      .filter(([namespaceId]) => !belongsToNamespace(element, namespaceId, input))
      .map(([, hull]) => hull);
    const bounds = findCandidate(
      element,
      [...wishes],
      [...placed.values()].map((item) => item.bounds).concat(foreignHulls),
      diagramBounds,
      ownHull,
      input.direction
    );
    placed.set(id, { ...element, bounds });
    unplaced.delete(id);
    assignments.push(
      element.kind === "class"
        ? { kind: "class", classId: element.id as ClassId, bounds }
        : { kind: "note", noteId: element.id as NoteId, bounds }
    );
  }
  return assignments;
}

function positionedElements(input: LayoutInput): Map<ElementId, PlacedElement> {
  const result = new Map<ElementId, PlacedElement>();
  input.classes.forEach((item) => {
    if (!item.bounds) return;
    const estimated = estimateUnpositionedClassSize(item);
    const bounds = {
      ...item.bounds,
      w: Math.max(item.bounds.w, estimated.w),
      h: Math.max(item.bounds.h, estimated.h),
    };
    result.set(item.id, {
      id: item.id,
      kind: "class",
      parentNamespaceId: item.parentNamespaceId,
      w: bounds.w,
      h: bounds.h,
      bounds,
    });
  });
  input.notes.forEach((item) => {
    if (!item.bounds) return;
    const estimated = estimateUnpositionedNoteSize(item);
    const bounds = {
      ...item.bounds,
      w: Math.max(item.bounds.w, estimated.w),
      h: Math.max(item.bounds.h, estimated.h),
    };
    result.set(item.id, {
      id: item.id,
      kind: "note",
      parentNamespaceId: null,
      w: bounds.w,
      h: bounds.h,
      bounds,
    });
  });
  return result;
}

function buildCoupling(input: LayoutInput): Coupling {
  const map = new Map<ElementId, Set<ElementId>>();
  const connect = (left: ElementId, right: ElementId) => {
    map.set(left, new Set([...(map.get(left) ?? []), right]));
    map.set(right, new Set([...(map.get(right) ?? []), left]));
  };
  input.relationships.forEach((item) => connect(item.sourceClassId, item.targetClassId));
  input.notes.forEach((item) => {
    if (item.attachedToClassId) connect(item.id, item.attachedToClassId);
  });
  return map;
}

function fallbackWish(
  element: IncrementalElement,
  bounds: Rect,
  direction: LayoutInput["direction"]
): Wish {
  const horizontal = isHorizontal(direction);
  const reversed = direction === "BT" || direction === "RL";
  const flowSize = horizontal ? element.w : element.h;
  const fallbackGap = INCREMENTAL_LAYOUT_MIN_GAP_RATIO * flowSize;
  const flow = reversed
    ? (horizontal ? bounds.x : bounds.y) - fallbackGap - flowSize / 2
    : (horizontal ? bounds.x + bounds.w : bounds.y + bounds.h) + fallbackGap + flowSize / 2;
  const cross = horizontal ? bounds.y + element.h / 2 : bounds.x + element.w / 2;
  return horizontal
    ? { x: flow, y: cross, weight: 1, flowSide: 0, anchorFlow: flow }
    : { x: cross, y: flow, weight: 1, flowSide: 0, anchorFlow: flow };
}

function deriveNamespaceHulls(
  input: LayoutInput,
  placed: ReadonlyMap<ElementId, PlacedElement>
): ReadonlyMap<NamespaceId, Rect> {
  const result = new Map<NamespaceId, Rect>();
  const namespaces = new Map(input.namespaces.map((item) => [item.id, item]));
  const derive = (id: NamespaceId): Rect | null => {
    if (result.has(id)) return result.get(id) ?? null;
    const namespace = namespaces.get(id);
    if (!namespace) return null;
    const rects: Rect[] = [];
    namespace.memberClassIds.forEach((classId) => {
      const item = placed.get(classId);
      if (item) rects.push(item.bounds);
    });
    namespace.childNamespaceIds.forEach((childId) => {
      const child = derive(childId);
      if (child) rects.push(child);
    });
    if (rects.length === 0) return null;
    const hull = expand(unionRects(rects), NAMESPACE_MARGIN);
    result.set(id, hull);
    return hull;
  };
  input.namespaces.forEach((item) => derive(item.id));
  return result;
}

function belongsToNamespace(
  element: IncrementalElement,
  namespaceId: NamespaceId,
  input: LayoutInput
): boolean {
  if (element.kind !== "class" || !element.parentNamespaceId) return false;
  const namespaces = new Map(input.namespaces.map((item) => [item.id, item]));
  let current: NamespaceId | null = element.parentNamespaceId;
  while (current) {
    if (current === namespaceId) return true;
    current = namespaces.get(current)?.parentNamespaceId ?? null;
  }
  return false;
}

export function unionRects(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    w: Math.max(...rects.map((rect) => rect.x + rect.w)) - x,
    h: Math.max(...rects.map((rect) => rect.y + rect.h)) - y,
  };
}

const expand = (rect: Rect, margin: number): Rect => ({
  x: rect.x - margin,
  y: rect.y - margin,
  w: rect.w + margin * 2,
  h: rect.h + margin * 2,
});
const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error("Missing incremental element");
  return value;
};
