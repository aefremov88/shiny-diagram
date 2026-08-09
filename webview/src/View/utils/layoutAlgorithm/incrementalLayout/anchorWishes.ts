import type { DiagramDirection } from "../../../../shared/uml";
import {
  INCREMENTAL_LAYOUT_MARKED_EDGE_WEIGHT,
  INCREMENTAL_LAYOUT_UNMARKED_EDGE_WEIGHT,
} from "../../../config/editorUiConfig";
import type { LayoutInput } from "../layoutContracts";
import { normalizeRelationship } from "../fullLayout/rankNormalization";
import type { ElementId, IncrementalElement, PlacedElement, Wish } from "./types";
import { minGap } from "./spacing";

export function toAnchorWishes(
  element: IncrementalElement,
  placed: ReadonlyMap<ElementId, PlacedElement>,
  input: LayoutInput,
  diagramBounds: { x: number; y: number; w: number; h: number }
): readonly Wish[] {
  const wishes: Wish[] = [];
  input.relationships.forEach((relationship) => {
    if (element.kind !== "class") return;
    const normalized = normalizeRelationship(relationship);
    if (!normalized) return;
    const otherId =
      relationship.sourceClassId === element.id
        ? relationship.targetClassId
        : relationship.targetClassId === element.id
          ? relationship.sourceClassId
          : null;
    if (!otherId) return;
    const other = placed.get(otherId);
    if (!other) return;
    const isMarked =
      normalized.sourceId !== relationship.sourceClassId ||
      ["triangle", "composition", "aggregation"].includes(relationship.sourceEndpointKind) ||
      ["triangle", "composition", "aggregation"].includes(relationship.targetEndpointKind);
    if (isMarked) {
      const elementIsParent = normalized.sourceId === element.id;
      wishes.push(
        flowWish(
          element,
          other,
          input.direction,
          elementIsParent ? -1 : 1,
          INCREMENTAL_LAYOUT_MARKED_EDGE_WEIGHT
        )
      );
    } else {
      wishes.push(
        besideWish(
          element,
          other,
          input.direction,
          diagramBounds,
          INCREMENTAL_LAYOUT_UNMARKED_EDGE_WEIGHT
        )
      );
    }
  });
  input.notes.forEach((note) => {
    if (!note.attachedToClassId) return;
    if (element.kind === "note" && element.id === note.id) {
      const other = placed.get(note.attachedToClassId);
      if (other)
        wishes.push(
          flowWish(element, other, input.direction, -1, INCREMENTAL_LAYOUT_MARKED_EDGE_WEIGHT)
        );
    } else if (element.kind === "class" && element.id === note.attachedToClassId) {
      const other = placed.get(note.id);
      if (other)
        wishes.push(
          flowWish(element, other, input.direction, 1, INCREMENTAL_LAYOUT_MARKED_EDGE_WEIGHT)
        );
    }
  });
  return wishes;
}

function flowWish(
  element: IncrementalElement,
  anchor: PlacedElement,
  direction: DiagramDirection | null,
  side: -1 | 1,
  weight: number
): Wish {
  const horizontal = isHorizontal(direction);
  const reversed = direction === "BT" || direction === "RL";
  const physicalSide = (reversed ? -side : side) as -1 | 1;
  const anchorCenter = center(anchor.bounds);
  const flow =
    (horizontal ? anchorCenter.x : anchorCenter.y) +
    physicalSide *
      ((horizontal ? anchor.bounds.w + element.w : anchor.bounds.h + element.h) / 2 +
        minGap(anchor.bounds, element, horizontal ? "x" : "y"));
  return horizontal
    ? { x: flow, y: anchorCenter.y, weight, flowSide: physicalSide, anchorFlow: anchorCenter.x }
    : { x: anchorCenter.x, y: flow, weight, flowSide: physicalSide, anchorFlow: anchorCenter.y };
}

function besideWish(
  element: IncrementalElement,
  anchor: PlacedElement,
  direction: DiagramDirection | null,
  diagramBounds: { x: number; y: number; w: number; h: number },
  weight: number
): Wish {
  const horizontal = isHorizontal(direction);
  const anchorCenter = center(anchor.bounds);
  const diagramCross = horizontal
    ? diagramBounds.y + diagramBounds.h / 2
    : diagramBounds.x + diagramBounds.w / 2;
  const anchorCross = horizontal ? anchorCenter.y : anchorCenter.x;
  const side = anchorCross > diagramCross ? -1 : 1;
  const cross =
    anchorCross +
    side *
      ((horizontal ? anchor.bounds.h + element.h : anchor.bounds.w + element.w) / 2 +
        minGap(anchor.bounds, element, horizontal ? "y" : "x"));
  return horizontal
    ? { x: anchorCenter.x, y: cross, weight, flowSide: 0, anchorFlow: anchorCenter.x }
    : { x: cross, y: anchorCenter.y, weight, flowSide: 0, anchorFlow: anchorCenter.y };
}

export const isHorizontal = (direction: DiagramDirection | null): boolean =>
  direction === "LR" || direction === "RL";

const center = (bounds: { x: number; y: number; w: number; h: number }) => ({
  x: bounds.x + bounds.w / 2,
  y: bounds.y + bounds.h / 2,
});
