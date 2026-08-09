import { describe, expect, it } from "vitest";
import { classId, emptyInput, layoutClass, noteId } from "./testFixtures";
import { routeLayout } from "./layoutRouter";

describe("layoutRouter", () => {
  it.each([0, 1])("uses full layout for %i positioned elements", (positioned) => {
    const classes = [layoutClass("A"), layoutClass("B")];
    if (positioned === 1) classes[0] = layoutClass("A", null, { x: 999, y: 999, w: 111, h: 77 });
    const result = routeLayout(
      emptyInput({
        classes,
        missingClassIds: positioned ? [classId("B")] : [classId("A"), classId("B")],
      })
    );
    expect(result).toHaveLength(2);
    const classA = result.find((item) => item.kind === "class" && item.classId === classId("A"));
    expect(classA).toBeDefined();
    expect(classA?.bounds.x).not.toBe(999);
  });

  it("uses incremental layout at two positioned elements", () => {
    const result = routeLayout(
      emptyInput({
        classes: [
          layoutClass("A", null, { x: 0, y: 0, w: 100, h: 100 }),
          layoutClass("B", null, { x: 200, y: 0, w: 100, h: 100 }),
          layoutClass("C"),
        ],
        missingClassIds: [classId("C")],
      })
    );
    expect(result.map((item) => item.kind === "class" && item.classId)).toEqual([classId("C")]);
  });

  it("counts positioned notes", () => {
    const result = routeLayout(
      emptyInput({
        classes: [layoutClass("A"), layoutClass("B")],
        missingClassIds: [classId("A"), classId("B")],
        notes: [
          {
            id: noteId("N1"),
            text: "",
            attachedToClassId: null,
            bounds: { x: 0, y: 0, w: 100, h: 80 },
          },
          {
            id: noteId("N2"),
            text: "",
            attachedToClassId: null,
            bounds: { x: 200, y: 0, w: 100, h: 80 },
          },
        ],
      })
    );
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.kind === "class")).toBe(true);
  });
});
