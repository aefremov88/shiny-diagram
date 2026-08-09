import { describe, expect, it } from "vitest";
import { classId, emptyInput, layoutClass, noteId, relationshipId } from "../testFixtures";
import { toAnchorWishes } from "./anchorWishes";
import type { IncrementalElement, PlacedElement } from "./types";
import { minGap } from "./spacing";

describe("anchorWishes", () => {
  it.each([
    ["TB", "y"],
    ["LR", "x"],
  ] as const)("puts a subclass after its parent under %s", (direction, axis) => {
    const parent = placed("Parent", { x: 100, y: 100, w: 100, h: 80 });
    const child = element("Child");
    const input = emptyInput({
      direction,
      classes: [layoutClass("Parent"), layoutClass("Child")],
      relationships: [
        {
          id: relationshipId("r"),
          sourceClassId: classId("Parent"),
          targetClassId: classId("Child"),
          sourceEndpointKind: "triangle",
          targetEndpointKind: "none",
        },
      ],
    });
    const wish = toAnchorWishes(child, new Map([[parent.id, parent]]), input, parent.bounds)[0];
    const parentCenter = axis === "x" ? 150 : 140;
    expect(axis === "x" ? wish.x : wish.y).toBeGreaterThan(parentCenter);
    const parentSize = axis === "x" ? parent.bounds.w : parent.bounds.h;
    const childSize = axis === "x" ? child.w : child.h;
    expect((axis === "x" ? wish.x : wish.y) - parentCenter).toBe(
      (parentSize + childSize) / 2 + minGap(parent.bounds, child, axis)
    );
  });

  it.each([
    ["TB", "y"],
    ["LR", "x"],
  ] as const)("puts an attached note before its class under %s", (direction, axis) => {
    const owner = placed("Owner", { x: 100, y: 100, w: 100, h: 80 });
    const note: IncrementalElement = {
      id: noteId("N"),
      kind: "note",
      parentNamespaceId: null,
      w: 100,
      h: 60,
    };
    const input = emptyInput({
      direction,
      notes: [{ id: noteId("N"), text: "note", attachedToClassId: classId("Owner"), bounds: null }],
    });
    const wish = toAnchorWishes(note, new Map([[owner.id, owner]]), input, owner.bounds)[0];
    const ownerCenter = axis === "x" ? 150 : 140;
    expect(axis === "x" ? wish.x : wish.y).toBeLessThan(ownerCenter);
    const ownerSize = axis === "x" ? owner.bounds.w : owner.bounds.h;
    const noteSize = axis === "x" ? note.w : note.h;
    expect(ownerCenter - (axis === "x" ? wish.x : wish.y)).toBe(
      (ownerSize + noteSize) / 2 + minGap(owner.bounds, note, axis)
    );
  });
});

const element = (id: string): IncrementalElement => ({
  id: classId(id),
  kind: "class",
  parentNamespaceId: null,
  w: 100,
  h: 80,
});
const placed = (id: string, bounds: PlacedElement["bounds"]): PlacedElement => ({
  ...element(id),
  bounds,
});
