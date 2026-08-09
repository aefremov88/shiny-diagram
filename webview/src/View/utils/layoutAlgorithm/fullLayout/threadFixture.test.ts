import { describe, expect, it, vi } from "vitest";
import type { DiagramDirection } from "../../../../shared/uml";
import { classId, emptyInput, layoutClass, noteId, relationshipId } from "../testFixtures";
import type { LayoutInput } from "../layoutContracts";
import { fullLayout } from "./fullLayout";
import { runDagre } from "./dagreAdapter";

describe("thread fullLayout fixture", () => {
  it("passes independently expected relationship and note edges to dagre", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    fullLayout(threadInput("LR"));
    const adapterCall = debug.mock.calls.find(([label]) => label === "[dagreAdapter]");
    expect(adapterCall?.[1]).toMatchObject({
      nodeCount: 15,
      edgeCount: 13 + 3,
      options: { rankdir: "LR" },
    });
    debug.mockRestore();
  });

  it.each([
    [null, "TB"],
    ["TB", "TB"],
    ["BT", "BT"],
    ["LR", "LR"],
    ["RL", "RL"],
  ] as const)("maps direction %s to rankdir %s", (direction, rankdir) => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    runDagre(direction, [{ id: "A", width: 100, height: 50 }], []);
    expect(debug).toHaveBeenCalledWith(
      "[dagreAdapter]",
      expect.objectContaining({ options: expect.objectContaining({ rankdir }) })
    );
    debug.mockRestore();
  });

  it.each(["TB", "LR"] as const)("satisfies flow-axis rank invariants under %s", (direction) => {
    const assignments = fullLayout(threadInput(direction));
    const bounds = new Map(
      assignments.map((assignment) => [
        assignment.kind === "class" ? assignment.classId : assignment.noteId,
        assignment.bounds,
      ])
    );
    expect(rankBandCount(bounds, direction)).toBeGreaterThanOrEqual(4);
    expect(
      isEarlier(center(bounds, "Attachment"), center(bounds, "ImageAttachment"), direction)
    ).toBe(true);
    expect(
      isEarlier(center(bounds, "Attachment"), center(bounds, "FileAttachment"), direction)
    ).toBe(true);
    expect(
      isEarlier(center(bounds, "note:0"), center(bounds, "ConversationThread"), direction)
    ).toBe(true);
    expect(isEarlier(center(bounds, "note:1"), center(bounds, "TextMessage"), direction)).toBe(
      true
    );
    expect(
      isEarlier(center(bounds, "note:2"), center(bounds, "NotificationService"), direction)
    ).toBe(true);
    const boxes = [...bounds.values()];
    boxes.forEach((box) => {
      expect([box.x, box.y, box.w, box.h].every(Number.isFinite)).toBe(true);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
    });
    for (let left = 0; left < boxes.length; left++)
      for (let right = left + 1; right < boxes.length; right++)
        expect(overlaps(boxes[left], boxes[right])).toBe(false);
  });
});

function threadInput(direction: DiagramDirection): LayoutInput {
  const relationship = (
    id: string,
    source: string,
    target: string,
    sourceEndpointKind = "none",
    targetEndpointKind = "none"
  ): LayoutInput["relationships"][number] => ({
    id: relationshipId(id),
    sourceClassId: classId(source),
    targetClassId: classId(target),
    sourceEndpointKind: sourceEndpointKind as "none",
    targetEndpointKind: targetEndpointKind as "none",
  });
  return emptyInput({
    direction,
    classes: [
      "ConversationThread",
      "DirectThread",
      "GroupThread",
      "UserContact",
      "TextMessage",
      "Attachment",
      "ImageAttachment",
      "FileAttachment",
      "MessageStatus",
      "Presence",
      "ThreadRepository",
      "NotificationService",
    ].map((id) => layoutClass(id)),
    relationships: [
      relationship("r0", "ConversationThread", "DirectThread", "triangle"),
      relationship("r1", "ConversationThread", "GroupThread", "triangle"),
      relationship("r2", "ConversationThread", "UserContact", "aggregation"),
      relationship("r3", "ConversationThread", "TextMessage", "composition"),
      relationship("r4", "TextMessage", "UserContact", "none", "arrow"),
      relationship("r5", "TextMessage", "Attachment", "aggregation"),
      relationship("r6", "Attachment", "ImageAttachment", "triangle"),
      relationship("r7", "Attachment", "FileAttachment", "triangle"),
      relationship("r8", "ConversationThread", "MessageStatus", "none", "arrow"),
      relationship("r9", "UserContact", "Presence", "none", "arrow"),
      relationship("r10", "ThreadRepository", "ConversationThread", "none", "arrow"),
      relationship("r11", "NotificationService", "TextMessage", "none", "arrow"),
      relationship("r12", "NotificationService", "ConversationThread", "none", "arrow"),
    ],
    notes: [
      {
        id: noteId("note:0"),
        text: "Central aggregate",
        attachedToClassId: classId("ConversationThread"),
        bounds: null,
      },
      {
        id: noteId("note:1"),
        text: "Resize test",
        attachedToClassId: classId("TextMessage"),
        bounds: null,
      },
      {
        id: noteId("note:2"),
        text: "Dependency service",
        attachedToClassId: classId("NotificationService"),
        bounds: null,
      },
    ],
    missingClassIds: [
      "ConversationThread",
      "DirectThread",
      "GroupThread",
      "UserContact",
      "TextMessage",
      "Attachment",
      "ImageAttachment",
      "FileAttachment",
      "MessageStatus",
      "Presence",
      "ThreadRepository",
      "NotificationService",
    ].map(classId),
  });
}

type Bounds = { x: number; y: number; w: number; h: number };

function center(bounds: ReadonlyMap<string, Bounds>, id: string): { x: number; y: number } {
  const box = bounds.get(id);
  if (!box) throw new Error(`Missing ${id}`);
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function isEarlier(
  left: { x: number; y: number },
  right: { x: number; y: number },
  direction: "TB" | "LR"
): boolean {
  return direction === "TB" ? left.y < right.y : left.x < right.x;
}

function rankBandCount(bounds: ReadonlyMap<string, Bounds>, direction: "TB" | "LR"): number {
  return new Set(
    [...bounds.values()].map((box) => (direction === "TB" ? box.y + box.h / 2 : box.x + box.w / 2))
  ).size;
}

function overlaps(left: Bounds, right: Bounds): boolean {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  );
}
