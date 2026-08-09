import { describe, expect, it } from "vitest";
import { toNoteId } from "../../../shared/ids";
import type { ProvenanceIndex } from "../../model/provenanceIndex";
import { resolveInsertStatement } from "./insertStatement";

const noteId = toNoteId("note:target");

describe("resolveInsertStatement", () => {
  it("keeps after-side formatting byte-identical", () => {
    const source = `classDiagram
note "Target"
`;
    const provenance = noteProvenance(1, 0, 13);

    expect(
      resolveInsertStatement(
        {
          kind: "insertStatement",
          payload: "same",
          anchor: { kind: "afterSameKind", statement: { kind: "note", noteId } },
        },
        provenance,
        source,
        "\n"
      ).replacementText
    ).toBe("\nsame");

    expect(
      resolveInsertStatement(
        {
          kind: "insertStatement",
          payload: "different",
          anchor: { kind: "afterDifferentKind", statement: { kind: "note", noteId } },
        },
        provenance,
        source,
        "\n"
      ).replacementText
    ).toBe("\n\ndifferent");
  });

  it("formats above-side insertion with a trailing EOL and no leading EOL", () => {
    const source = `classDiagram
  note "Target"
`;
    const provenance = noteProvenance(1, 0, 15);

    expect(
      resolveInsertStatement(
        {
          kind: "insertStatement",
          payload: "%% @note: x=1 y=2 w=3 h=4",
          anchor: { kind: "aboveStatement", statement: { kind: "note", noteId } },
        },
        provenance,
        source,
        "\n"
      )
    ).toEqual({
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
      replacementText: "  %% @note: x=1 y=2 w=3 h=4\n",
    });
  });
});

function noteProvenance(
  line: number,
  startCharacter: number,
  endCharacter: number
): ProvenanceIndex {
  const self = {
    start: { line, character: startCharacter },
    end: { line, character: endCharacter },
  };
  return {
    diagram: {
      self: { start: { line: 0, character: 0 }, end: self.end },
      header: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: "classDiagram".length },
      },
      body: { start: { line: 0, character: "classDiagram".length }, end: self.end },
      direction: null,
      configDirectives: [],
    },
    notes: new Map([[noteId, { self, fields: { text: self } }]]),
    noteAnnotations: new Map(),
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
