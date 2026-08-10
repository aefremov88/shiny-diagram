import { describe, expect, it } from "vitest";
import { fullLayout } from "../../src/View/utils/layoutAlgorithm/fullLayout/fullLayout";
import {
  classId,
  emptyInput,
  layoutClass,
  namespaceId,
  noteId,
} from "../../src/View/utils/layoutAlgorithm/testFixtures";

describe("full layout contracts", () => {
  it("placed elements do not overlap", () => {
    const result = fullLayout(
      emptyInput({
        classes: [layoutClass("A"), layoutClass("B")],
        notes: [{ id: noteId("N"), text: "note", attachedToClassId: classId("A"), bounds: null }],
        missingClassIds: [classId("A"), classId("B")],
      })
    );
    for (let left = 0; left < result.length; left++) {
      for (let right = left + 1; right < result.length; right++) {
        expect(overlaps(result[left].bounds, result[right].bounds)).toBe(false);
      }
    }
  });

  it("classes remain contained by their namespace hull", () => {
    const result = fullLayout(
      emptyInput({
        classes: [layoutClass("A", "Domain"), layoutClass("B", "Domain")],
        namespaces: [
          {
            id: namespaceId("Domain"),
            parentNamespaceId: null,
            memberClassIds: [classId("A"), classId("B")],
            childNamespaceIds: [],
          },
        ],
        missingClassIds: [classId("A"), classId("B")],
      })
    );
    const boxes = result.map(({ bounds }) => bounds);
    const hull = {
      left: Math.min(...boxes.map(({ x }) => x)),
      top: Math.min(...boxes.map(({ y }) => y)),
      right: Math.max(...boxes.map(({ x, w }) => x + w)),
      bottom: Math.max(...boxes.map(({ y, h }) => y + h)),
    };
    boxes.forEach(({ x, y, w, h }) => {
      expect(x).toBeGreaterThanOrEqual(hull.left);
      expect(y).toBeGreaterThanOrEqual(hull.top);
      expect(x + w).toBeLessThanOrEqual(hull.right);
      expect(y + h).toBeLessThanOrEqual(hull.bottom);
    });
  });
});

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
