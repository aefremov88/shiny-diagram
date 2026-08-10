import { describe, expect, it } from "vitest";
import { incrementalLayout } from "../../src/View/utils/layoutAlgorithm/incrementalLayout/incrementalLayout";
import {
  classId,
  emptyInput,
  layoutClass,
  noteId,
} from "../../src/View/utils/layoutAlgorithm/testFixtures";

describe("incremental layout contracts", () => {
  const input = () =>
    emptyInput({
      classes: [
        layoutClass("Fixed", null, { x: 0, y: 0, w: 160, h: 80 }),
        layoutClass("A"),
        layoutClass("B"),
      ],
      notes: [{ id: noteId("N"), text: "note", attachedToClassId: classId("Fixed"), bounds: null }],
      missingClassIds: [classId("A"), classId("B")],
    });

  it("incremental layout does not move positioned elements", () => {
    expect(
      incrementalLayout(input()).some(
        (item) => item.kind === "class" && item.classId === classId("Fixed")
      )
    ).toBe(false);
  });

  it("incremental layout assigns every and only unpositioned element", () => {
    const ids = incrementalLayout(input()).map((item) =>
      item.kind === "class" ? item.classId : item.noteId
    );
    expect(new Set(ids)).toEqual(new Set([classId("A"), classId("B"), noteId("N")]));
  });

  it("placed elements do not overlap", () => {
    const result = incrementalLayout(input());
    for (let left = 0; left < result.length; left++) {
      for (let right = left + 1; right < result.length; right++) {
        expect(overlaps(result[left].bounds, result[right].bounds)).toBe(false);
      }
    }
  });
});

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
