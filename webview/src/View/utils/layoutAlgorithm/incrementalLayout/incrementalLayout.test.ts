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
import { incrementalLayout } from "./incrementalLayout";
import { overlaps } from "./candidateSearch";
import { minGap } from "./spacing";

describe("incrementalLayout", () => {
  it.each(["TB", "LR"] as const)(
    "keeps positioned elements fixed and follows hierarchy/note convention under %s",
    (direction) => {
      const input = emptyInput({
        direction,
        classes: [
          layoutClass("Parent", null, { x: 300, y: 300, w: 160, h: 80 }),
          layoutClass("Anchor", null, { x: 600, y: 300, w: 160, h: 80 }),
          layoutClass("Child"),
        ],
        relationships: [
          {
            id: relationshipId("r"),
            sourceClassId: classId("Parent"),
            targetClassId: classId("Child"),
            sourceEndpointKind: "triangle",
            targetEndpointKind: "none",
          },
        ],
        notes: [
          { id: noteId("N"), text: "note", attachedToClassId: classId("Anchor"), bounds: null },
        ],
        missingClassIds: [classId("Child")],
      });
      const result = incrementalLayout(input);
      expect(result.map((item) => (item.kind === "class" ? item.classId : item.noteId))).toEqual([
        classId("Child"),
        noteId("N"),
      ]);
      const child = result[0].bounds;
      const note = result[1].bounds;
      expect(direction === "TB" ? child.y > 380 : child.x > 460).toBe(true);
      expect(direction === "TB" ? note.y + note.h < 300 : note.x + note.w < 600).toBe(true);
    }
  );

  it("places a two-anchor newcomer between its partners", () => {
    const input = emptyInput({
      classes: [
        layoutClass("Left", null, { x: 0, y: 200, w: 100, h: 80 }),
        layoutClass("Right", null, { x: 600, y: 200, w: 100, h: 80 }),
        layoutClass("Middle"),
      ],
      relationships: [rel("a", "Middle", "Left"), rel("b", "Middle", "Right")],
      missingClassIds: [classId("Middle")],
    });
    const middle = incrementalLayout(input)[0].bounds;
    expect(middle.x).toBeGreaterThan(100);
    expect(middle.x + middle.w).toBeLessThan(600);
  });

  it("avoids foreign namespace hulls and favors its own hull", () => {
    const input = emptyInput({
      classes: [
        layoutClass("Foreign", "ForeignNs", { x: 200, y: 200, w: 160, h: 80 }),
        layoutClass("Own", "OwnNs", { x: 500, y: 200, w: 160, h: 80 }),
        layoutClass("New", "OwnNs"),
      ],
      namespaces: [
        {
          id: namespaceId("ForeignNs"),
          parentNamespaceId: null,
          memberClassIds: [classId("Foreign")],
          childNamespaceIds: [],
        },
        {
          id: namespaceId("OwnNs"),
          parentNamespaceId: null,
          memberClassIds: [classId("Own"), classId("New")],
          childNamespaceIds: [],
        },
      ],
      relationships: [rel("r", "New", "Foreign")],
      missingClassIds: [classId("New")],
    });
    const bounds = incrementalLayout(input)[0].bounds;
    const foreignHull = {
      x: 200 - NAMESPACE_MARGIN,
      y: 200 - NAMESPACE_MARGIN,
      w: 160 + NAMESPACE_MARGIN * 2,
      h: 80 + NAMESPACE_MARGIN * 2,
    };
    expect(overlaps(bounds, foreignHull)).toBe(false);
  });

  it("places successive orphans without overlap and deterministically", () => {
    const input = emptyInput({
      classes: [
        layoutClass("FixedA", null, { x: 0, y: 0, w: 200, h: 200 }),
        layoutClass("FixedB", null, { x: 250, y: 0, w: 200, h: 200 }),
        layoutClass("A"),
        layoutClass("B"),
      ],
      missingClassIds: [classId("A"), classId("B")],
    });
    const first = incrementalLayout(input);
    expect(first).toEqual(incrementalLayout(input));
    expect(overlaps(first[0].bounds, first[1].bounds)).toBe(false);
    expect(first.every((item) => item.bounds.y >= 200)).toBe(true);
  });

  it("uses rendered structural height for an undersized positioned obstacle", () => {
    const attachment = {
      ...layoutClass("Attachment", null, { x: 1040, y: 890, w: 240, h: 154 }),
      members: [
        { kind: "field" as const, text: "UUID id" },
        { kind: "field" as const, text: "string fileName" },
        { kind: "field" as const, text: "int sizeBytes" },
        { kind: "method" as const, text: "downloadUrl() string" },
      ],
    };
    const fileAttachment = {
      ...layoutClass("FileAttachment"),
      members: [
        { kind: "field" as const, text: "string mimeType" },
        { kind: "field" as const, text: "string checksum" },
      ],
    };
    const input = emptyInput({
      classes: [
        attachment,
        layoutClass("Other", null, { x: 400, y: 400, w: 160, h: 85 }),
        fileAttachment,
      ],
      relationships: [
        {
          id: relationshipId("inheritance"),
          sourceClassId: classId("Attachment"),
          targetClassId: classId("FileAttachment"),
          sourceEndpointKind: "triangle",
          targetEndpointKind: "none",
        },
      ],
      missingClassIds: [classId("FileAttachment")],
    });
    const generated = incrementalLayout(input)[0].bounds;
    const effectiveAttachment = { x: 1040, y: 890, w: 240, h: 177 };
    const requiredGap = minGap(effectiveAttachment, generated, "y");
    expect(generated.y - (effectiveAttachment.y + effectiveAttachment.h)).toBeGreaterThanOrEqual(
      requiredGap
    );
  });

  it("produces stable assignments for a mixed thread fixture", () => {
    const positioned = [
      layoutClass("ConversationThread", null, { x: 548, y: 209, w: 200, h: 58 }),
      layoutClass("DirectThread", null, { x: 860, y: 40, w: 160, h: 58 }),
      layoutClass("GroupThread", null, { x: 860, y: 148, w: 160, h: 58 }),
      layoutClass("TextMessage", null, { x: 808, y: 374, w: 264, h: 202 }),
      layoutClass("Attachment", null, { x: 1164, y: 453, w: 160, h: 58 }),
      layoutClass("NotificationService", null, { x: 280, y: 217, w: 208, h: 58 }),
    ];
    const input = emptyInput({
      direction: "LR",
      classes: [
        ...positioned,
        {
          ...layoutClass("ImageAttachment"),
          members: [
            { kind: "field", text: "int width" },
            { kind: "field", text: "int height" },
            { kind: "field", text: "string thumbnailUrl" },
          ],
        },
        {
          ...layoutClass("FileAttachment"),
          members: [
            { kind: "field", text: "string mimeType" },
            { kind: "field", text: "string checksum" },
          ],
        },
        layoutClass("AuditLog"),
      ],
      relationships: [
        {
          ...rel("image", "Attachment", "ImageAttachment"),
          sourceEndpointKind: "triangle",
        },
        {
          ...rel("file", "Attachment", "FileAttachment"),
          sourceEndpointKind: "triangle",
        },
        rel("audit", "AuditLog", "ConversationThread"),
      ],
      notes: [
        {
          id: noteId("NewNote"),
          text: "Audited aggregate",
          attachedToClassId: classId("ConversationThread"),
          bounds: null,
        },
      ],
      missingClassIds: [classId("ImageAttachment"), classId("FileAttachment"), classId("AuditLog")],
    });
    expect(incrementalLayout(input)).toMatchInlineSnapshot(`
      [
        {
          "bounds": {
            "h": 85,
            "w": 160,
            "x": 570,
            "y": 357.5,
          },
          "classId": "AuditLog",
          "kind": "class",
        },
        {
          "bounds": {
            "h": 131,
            "w": 176,
            "x": 1412,
            "y": 434.5,
          },
          "classId": "FileAttachment",
          "kind": "class",
        },
        {
          "bounds": {
            "h": 154,
            "w": 208,
            "x": 1396,
            "y": 223,
          },
          "classId": "ImageAttachment",
          "kind": "class",
        },
        {
          "bounds": {
            "h": 44,
            "w": 180,
            "x": 310,
            "y": 328,
          },
          "kind": "note",
          "noteId": "NewNote",
        },
      ]
    `);
  });
});

const rel = (id: string, source: string, target: string) => ({
  id: relationshipId(id),
  sourceClassId: classId(source),
  targetClassId: classId(target),
  sourceEndpointKind: "none" as const,
  targetEndpointKind: "none" as const,
});
