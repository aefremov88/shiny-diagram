import { describe, expect, it } from "vitest";
import { classId } from "../testFixtures";
import { findCandidate, hasClearance } from "./candidateSearch";
import { noteId } from "../testFixtures";

describe("candidateSearch", () => {
  const element = {
    id: classId("New"),
    kind: "class" as const,
    parentNamespaceId: null,
    w: 100,
    h: 100,
  };

  it("rejects candidates that overlap or violate proportional clearance", () => {
    const obstacle = { x: 100, y: 100, w: 100, h: 100 };
    expect(hasClearance({ x: 200, y: 100, w: 100, h: 100 }, obstacle)).toBe(false);
    expect(hasClearance({ x: 225, y: 100, w: 100, h: 100 }, obstacle)).toBe(true);
  });

  it("takes a nearby offset when the direct wish is crowded", () => {
    const bounds = findCandidate(
      element,
      [{ x: 150, y: 275, weight: 3, flowSide: 1, anchorFlow: 150 }],
      [
        { x: 100, y: 100, w: 100, h: 100 },
        { x: 100, y: 225, w: 100, h: 100 },
      ],
      { x: 100, y: 100, w: 100, h: 225 },
      null,
      "TB"
    );
    expect(bounds.y).toBe(350);
    expect(
      [
        { x: 100, y: 100, w: 100, h: 100 },
        { x: 100, y: 225, w: 100, h: 100 },
      ].every((obstacle) => hasClearance(bounds, obstacle))
    ).toBe(true);
  });

  it("selects the exact capped gap for a 400-high box and 60-high note", () => {
    const owner = { x: 100, y: 140, w: 200, h: 400 };
    const note = {
      id: noteId("N"),
      kind: "note" as const,
      parentNamespaceId: null,
      w: 100,
      h: 60,
    };
    const bounds = findCandidate(
      note,
      [{ x: 200, y: 50, weight: 3, flowSide: -1, anchorFlow: 340 }],
      [owner],
      owner,
      null,
      "TB"
    );
    expect(owner.y - (bounds.y + bounds.h)).toBe(60);
    expect(hasClearance(bounds, owner)).toBe(true);
  });
});
