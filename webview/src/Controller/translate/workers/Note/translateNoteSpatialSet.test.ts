import { describe, expect, it } from "vitest";
import { toNoteId } from "../../../../shared/ids";
import type { DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import { translateNoteSpatialSet } from "./translateNoteSpatialSet";

const noteId = toNoteId("note:target");
const previousNoteId = toNoteId("note:previous");
const spatial = { position: { x: 10.4, y: 20.6 }, size: { width: 100, height: 80 } };

describe("translateNoteSpatialSet", () => {
  it("anchors a missing annotation directly above its note", () => {
    expect(
      translateNoteSpatialSet(
        { type: "note.spatial.set", noteId, spatial },
        {} as DiagramGraph,
        provenance(false, true)
      )
    ).toEqual([
      {
        kind: "insertStatement",
        payload: "%% @note: x=10 y=21 w=100 h=80",
        anchor: {
          kind: "aboveStatement",
          statement: { kind: "note", noteId },
        },
      },
    ]);
  });

  it("anchors above the note when it is the first statement", () => {
    expect(
      translateNoteSpatialSet(
        { type: "note.spatial.set", noteId, spatial },
        {} as DiagramGraph,
        provenance(false, false)
      )[0]
    ).toMatchObject({
      kind: "insertStatement",
      anchor: { kind: "aboveStatement", statement: { kind: "note", noteId } },
    });
  });

  it("replaces all coordinates when the annotation exists", () => {
    const intents = translateNoteSpatialSet(
      { type: "note.spatial.set", noteId, spatial },
      {} as DiagramGraph,
      provenance(true, false)
    );
    expect(intents).toHaveLength(4);
    expect(intents.every((intent) => intent.kind === "replaceValue")).toBe(true);
  });
});

function provenance(hasAnnotation: boolean, hasPreviousNote: boolean): ProvenanceIndex {
  const target = { self: span(2, 0, 2, 13), fields: { text: span(2, 6, 2, 12) } };
  const previous = { self: span(1, 0, 1, 15), fields: { text: span(1, 6, 1, 14) } };
  const coord = span(1, 0, 1, 1);
  return {
    diagram: {
      self: span(0, 0, 2, 13),
      header: span(0, 0, 0, 12),
      body: span(0, 12, 2, 13),
      direction: null,
      configDirectives: [],
    },
    notes: new Map([
      ...(hasPreviousNote ? ([[previousNoteId, previous]] as const) : []),
      [noteId, target],
    ]),
    noteAnnotations: new Map(
      hasAnnotation
        ? [
            [
              noteId,
              {
                self: span(1, 0, 1, 30),
                fields: { target: coord, x: coord, y: coord, w: coord, h: coord },
              },
            ],
          ]
        : []
    ),
    classes: new Map(),
    namespaces: new Map(),
    namespaceStyles: new Map(),
    blockMembers: new Map(),
    shortMembers: new Map(),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map(),
  };
}

function span(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  };
}
