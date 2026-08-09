import { describe, expect, it } from "vitest";
import { toClassId } from "../../../shared/ids";
import type { ProvenanceIndex } from "../../model/provenanceIndex";
import type { DiagramGraph } from "../../model/diagramGraph";
import { rewriteBlocklessClassWithFirstChild } from "./classBlockEnsure";

describe("rewriteBlocklessClassWithFirstChild", () => {
  it("deletes and reinserts the declaration with a non-empty first body", () => {
    const classId = toClassId("User");
    const intents = rewriteBlocklessClassWithFirstChild(
      classId,
      {
        classes: new Map([[classId, { id: classId, parentNamespaceId: null }]]),
      } as unknown as DiagramGraph,
      toProvenance(),
      'classDiagram\n  class User["Human User"]',
      "+id"
    );

    expect(intents).toEqual([
      {
        kind: "deleteStatement",
        target: { kind: "class", classId },
      },
      {
        kind: "insertStatement",
        anchor: { kind: "atBlockOpening", block: { kind: "diagram" } },
        payload: 'class User["Human User"] {\n  +id\n}',
      },
    ]);
  });
});

function toProvenance(): ProvenanceIndex {
  const classId = toClassId("User");
  const empty = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
  return {
    diagram: {
      self: empty,
      header: empty,
      body: empty,
      direction: null,
      configDirectives: [],
    },
    classes: new Map([
      [
        classId,
        {
          self: { start: { line: 1, character: 2 }, end: { line: 1, character: 27 } },
          header: { start: { line: 1, character: 2 }, end: { line: 1, character: 27 } },
          body: null,
          fields: {
            declaredName: { start: { line: 1, character: 8 }, end: { line: 1, character: 12 } },
            labelFull: { start: { line: 1, character: 12 }, end: { line: 1, character: 27 } },
          },
        },
      ],
    ]),
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
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}
