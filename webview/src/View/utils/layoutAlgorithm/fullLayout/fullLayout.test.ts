import { describe, expect, it } from "vitest";
import { NAMESPACE_MARGIN } from "../../../config/editorUiConfig";
import {
  classId,
  emptyInput,
  layoutClass,
  namespaceId,
  noteId,
  relationshipId,
} from "../testFixtures";
import { fullLayout } from "./fullLayout";

describe("fullLayout", () => {
  it("lays out a layered namespace fixture with notes using invariants", () => {
    const input = emptyInput({
      classes: [
        layoutClass("ConversationThread"),
        layoutClass("TextMessage", "Messaging"),
        layoutClass("Delivery", "Messaging"),
      ],
      namespaces: [
        {
          id: namespaceId("Messaging"),
          parentNamespaceId: null,
          memberClassIds: [classId("TextMessage"), classId("Delivery")],
          childNamespaceIds: [],
        },
      ],
      relationships: [
        {
          id: relationshipId("inheritance"),
          sourceClassId: classId("TextMessage"),
          targetClassId: classId("ConversationThread"),
          sourceEndpointKind: "none",
          targetEndpointKind: "triangle",
        },
      ],
      notes: [
        {
          id: noteId("attached"),
          text: "Creates messages",
          attachedToClassId: classId("TextMessage"),
          bounds: null,
        },
        { id: noteId("free"), text: "Messaging overview", attachedToClassId: null, bounds: null },
      ],
      missingClassIds: [classId("ConversationThread"), classId("TextMessage"), classId("Delivery")],
    });
    const result = fullLayout(input);
    expect(result).toHaveLength(5);
    result.forEach(({ bounds }) => {
      expect([bounds.x, bounds.y, bounds.w, bounds.h].every(Number.isFinite)).toBe(true);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
    });
    const byId = new Map<string, (typeof result)[number]["bounds"]>(
      result.map((item) => [item.kind === "class" ? item.classId : item.noteId, item.bounds])
    );
    const getBounds = (id: string) => {
      const bounds = byId.get(id);
      if (!bounds) throw new Error(`Missing bounds for ${id}`);
      return bounds;
    };
    const centerY = (id: string) => {
      const bounds = getBounds(id);
      return bounds.y + bounds.h / 2;
    };
    expect(centerY("ConversationThread")).toBeLessThan(centerY("TextMessage"));
    expect(centerY("attached")).toBeLessThan(centerY("TextMessage"));
    const boxes = [...byId.values()];
    for (let left = 0; left < boxes.length; left++)
      for (let right = left + 1; right < boxes.length; right++)
        expect(overlaps(boxes[left], boxes[right])).toBe(false);

    const members = [getBounds("TextMessage"), getBounds("Delivery")];
    const hull = {
      x: Math.min(...members.map((box) => box.x)) - NAMESPACE_MARGIN,
      y: Math.min(...members.map((box) => box.y)) - NAMESPACE_MARGIN,
      right: Math.max(...members.map((box) => box.x + box.w)) + NAMESPACE_MARGIN,
      bottom: Math.max(...members.map((box) => box.y + box.h)) + NAMESPACE_MARGIN,
    };
    members.forEach((box) => {
      expect(box.x).toBeGreaterThanOrEqual(hull.x + NAMESPACE_MARGIN);
      expect(box.y).toBeGreaterThanOrEqual(hull.y + NAMESPACE_MARGIN);
      expect(box.x + box.w).toBeLessThanOrEqual(hull.right - NAMESPACE_MARGIN);
      expect(box.y + box.h).toBeLessThanOrEqual(hull.bottom - NAMESPACE_MARGIN);
    });
  });

  it("handles empty diagrams and cycles deterministically", () => {
    expect(fullLayout(emptyInput())).toEqual([]);
    const input = emptyInput({
      classes: [layoutClass("A"), layoutClass("B")],
      relationships: [
        {
          id: relationshipId("ab"),
          sourceClassId: classId("A"),
          targetClassId: classId("B"),
          sourceEndpointKind: "none",
          targetEndpointKind: "none",
        },
        {
          id: relationshipId("ba"),
          sourceClassId: classId("B"),
          targetClassId: classId("A"),
          sourceEndpointKind: "none",
          targetEndpointKind: "none",
        },
      ],
      missingClassIds: [classId("A"), classId("B")],
    });
    expect(fullLayout(input)).toEqual(fullLayout(input));
  });
});

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
