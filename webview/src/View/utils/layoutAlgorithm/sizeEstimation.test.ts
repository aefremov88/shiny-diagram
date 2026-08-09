import { describe, expect, it } from "vitest";
import { LAYOUT_CLASS_MAX_WIDTH, LAYOUT_CLASS_MIN_WIDTH } from "../../config/editorUiConfig";
import { estimateClassSize, estimateNoteSize } from "./sizeEstimation";
import { emptyInput, layoutClass, noteId } from "./testFixtures";

describe("sizeEstimation", () => {
  it("grows class height with member count", () => {
    const empty = layoutClass("A");
    const populated = { ...empty, members: [{ kind: "field" as const, text: "value" }] };
    expect(estimateClassSize(populated).h).toBeGreaterThan(estimateClassSize(empty).h);
  });

  it("includes persistent member affordances and compartment chrome", () => {
    expect(estimateClassSize(layoutClass("Empty")).h).toBe(85);
    expect(
      estimateClassSize({
        ...layoutClass("FileAttachment"),
        members: [
          { kind: "field", text: "string mimeType" },
          { kind: "field", text: "string checksum" },
        ],
      }).h
    ).toBe(131);
  });

  it("clamps class width", () => {
    expect(estimateClassSize(layoutClass("A")).w).toBe(LAYOUT_CLASS_MIN_WIDTH);
    expect(estimateClassSize({ ...layoutClass("A"), headerTexts: ["x".repeat(1000)] }).w).toBe(
      LAYOUT_CLASS_MAX_WIDTH
    );
  });

  it("preserves annotated sizes", () => {
    expect(estimateClassSize(layoutClass("A", null, { x: 9, y: 8, w: 321, h: 123 }))).toEqual({
      w: 321,
      h: 123,
    });
    const note = emptyInput({
      notes: [
        {
          id: noteId("N"),
          text: "text",
          attachedToClassId: null,
          bounds: { x: 1, y: 2, w: 77, h: 88 },
        },
      ],
    }).notes[0];
    expect(estimateNoteSize(note)).toEqual({ w: 77, h: 88 });
  });
});
