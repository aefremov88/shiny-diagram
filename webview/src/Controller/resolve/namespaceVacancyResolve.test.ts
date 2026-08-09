import { describe, expect, it } from "vitest";
import { toClassId, toDiagramId, toNamespaceId } from "../../shared/ids";
import type { ClassNode, DiagramGraph, NamespaceNode } from "../model/diagramGraph";
import type {
  ClassRecord,
  NamespaceRecord,
  NamespaceStyleRecord,
  ProvenanceIndex,
  SourceSpan,
  SpatialRecord,
} from "../model/provenanceIndex";
import type { SourceEdit } from "../model/sourceEdit";
import { translateCommands } from "../translate";
import { resolveIntents } from "./resolveIntents";

describe("namespace vacancy resolve", () => {
  it("moves a styled child namespace out of an emptied parent without overlapping edits", () => {
    const source = `classDiagram
%% @spatial:X x=0 y=0 w=10 h=10
namespace A {
  namespace B {
    class X
  }
}
%% @style:A.B fill=blue
`;
    const transaction: Parameters<typeof translateCommands>[0] = [
      {
        type: "namespace.parentNamespace.set",
        namespaceId: toNamespaceId("A.B"),
        parentNamespaceId: null,
      },
    ];
    const translated = translateCommands(
      transaction,
      reparentGraph(),
      reparentProvenance(),
      source
    );
    const edits = resolveIntents(translated.intents, reparentProvenance(), source);

    expect(translated.outcome.namespaces.renamed).toEqual([
      { from: toNamespaceId("A.B"), to: toNamespaceId("B") },
    ]);
    expect(applyEdits(source, edits)).toBe(`classDiagram
%% @spatial:X x=0 y=0 w=10 h=10
%% @style:B fill=blue

namespace B {
  class X
}
`);
  });

  it("moves every remaining parent member out in one transaction without overlap", () => {
    const source = `classDiagram
%% @spatial:X x=0 y=0 w=10 h=10
%% @spatial:Y x=50 y=0 w=10 h=10
namespace A {
  class Y
  namespace B {
    class X
  }
}
%% @style:A.B fill=blue
`;
    const transaction: Parameters<typeof translateCommands>[0] = [
      {
        type: "namespace.parentNamespace.set",
        namespaceId: toNamespaceId("A.B"),
        parentNamespaceId: null,
      },
      { type: "class.parentNamespace.set", classId: toClassId("Y"), parentNamespaceId: null },
    ];
    const provenance = multiMoveProvenance();
    const translated = translateCommands(transaction, multiMoveGraph(), provenance, source);
    const edits = resolveIntents(translated.intents, provenance, source);

    expect(translated.outcome.namespaces.renamed).toEqual([
      { from: toNamespaceId("A.B"), to: toNamespaceId("B") },
    ]);
    expect(applyEdits(source, edits)).toBe(`classDiagram
%% @spatial:X x=0 y=0 w=10 h=10
%% @spatial:Y x=50 y=0 w=10 h=10
%% @style:B fill=blue

namespace B {
  class X
}

class Y
`);
  });
});

function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  return [...edits]
    .sort((left, right) => toOffset(source, right.start) - toOffset(source, left.start))
    .reduce(
      (text, edit) =>
        `${text.slice(0, toOffset(source, edit.start))}${edit.replacementText}${text.slice(
          toOffset(source, edit.end)
        )}`,
      source
    );
}

function toOffset(source: string, position: SourceSpan["start"]): number {
  const lines = source.split("\n");
  return (
    lines.slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) +
    position.character
  );
}

function reparentGraph(): DiagramGraph {
  const classId = toClassId("X");
  const parentId = toNamespaceId("A");
  const childId = toNamespaceId("A.B");
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map([[classId, classNode(classId, childId)]]),
    namespaces: new Map([
      [parentId, namespaceNode(parentId, null)],
      [childId, namespaceNode(childId, parentId)],
    ]),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function multiMoveGraph(): DiagramGraph {
  const classXId = toClassId("X");
  const classYId = toClassId("Y");
  const parentId = toNamespaceId("A");
  const childId = toNamespaceId("A.B");
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map([
      [classXId, classNode(classXId, childId)],
      [classYId, classNode(classYId, parentId)],
    ]),
    namespaces: new Map([
      [parentId, namespaceNode(parentId, null)],
      [childId, namespaceNode(childId, parentId)],
    ]),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function classNode(
  classId: ClassNode["id"],
  parentNamespaceId: ClassNode["parentNamespaceId"]
): ClassNode {
  return {
    kind: "class",
    id: classId,
    name: classId,
    label: classId,
    genericType: null,
    annotation: null,
    parentNamespaceId,
    spatial: null,
    attributes: [],
    methods: [],
    lollipopInterfaces: [],
    directStyle: null,
    interaction: null,
  };
}

function namespaceNode(
  namespaceId: NamespaceNode["id"],
  parentNamespaceId: NamespaceNode["parentNamespaceId"]
): NamespaceNode {
  return {
    kind: "namespace",
    id: namespaceId,
    name: namespaceId,
    label: namespaceId.slice(namespaceId.lastIndexOf(".") + 1),
    parentNamespaceId,
    style: null,
  };
}

function reparentProvenance(): ProvenanceIndex {
  const classId = toClassId("X");
  const parentId = toNamespaceId("A");
  const childId = toNamespaceId("A.B");
  return {
    diagram: {
      self: span(0, 0, 7, 0),
      header: span(0, 0, 0, 12),
      body: span(1, 0, 7, 0),
      direction: null,
      configDirectives: [],
    },
    classes: new Map([[classId, classRecord(4, 4, 11)]]),
    namespaces: new Map([
      [parentId, namespaceRecord(2, 0, 6, 1, 10, 11)],
      [childId, namespaceRecord(3, 2, 5, 3, 12, 13)],
    ]),
    namespaceStyles: new Map([[childId, namespaceStyleRecord()]]),
    blockMembers: new Map(),
    shortMembers: new Map(),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map([[classId, spatialRecord()]]),
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}

function multiMoveProvenance(): ProvenanceIndex {
  const classXId = toClassId("X");
  const classYId = toClassId("Y");
  const parentId = toNamespaceId("A");
  const childId = toNamespaceId("A.B");
  return {
    diagram: {
      self: span(0, 0, 9, 0),
      header: span(0, 0, 0, 12),
      body: span(1, 0, 9, 0),
      direction: null,
      configDirectives: [],
    },
    classes: new Map([
      [classXId, classRecord(6, 4, 11)],
      [classYId, classRecord(4, 2, 9)],
    ]),
    namespaces: new Map([
      [parentId, namespaceRecord(3, 0, 8, 1, 10, 11)],
      [childId, namespaceRecord(5, 2, 7, 3, 12, 13)],
    ]),
    namespaceStyles: new Map([[childId, namespaceStyleRecordAt(9)]]),
    blockMembers: new Map(),
    shortMembers: new Map(),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map([
      [classXId, spatialRecordAt(1, 12, 13)],
      [classYId, spatialRecordAt(2, 12, 13)],
    ]),
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}

function classRecord(line: number, startCharacter: number, endCharacter: number): ClassRecord {
  return {
    self: span(line, startCharacter, line, endCharacter),
    header: span(line, startCharacter, line, endCharacter),
    body: null,
    fields: { declaredName: span(line, endCharacter - 1, line, endCharacter) },
  };
}

function namespaceRecord(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
  nameStart: number,
  nameEnd: number
): NamespaceRecord {
  return {
    self: span(startLine, startCharacter, endLine, endCharacter),
    header: span(startLine, startCharacter, startLine, nameEnd + 2),
    body: span(startLine + 1, 0, endLine - 1, 0),
    fields: { declaredName: span(startLine, nameStart, startLine, nameEnd) },
  };
}

function namespaceStyleRecord(): NamespaceStyleRecord {
  return namespaceStyleRecordAt(7);
}

function namespaceStyleRecordAt(line: number): NamespaceStyleRecord {
  return {
    self: span(line, 0, line, 23),
    fields: { target: span(line, 10, line, 13), propertyList: span(line, 14, line, 23) },
  };
}

function spatialRecord(): SpatialRecord {
  return spatialRecordAt(1, 12, 13);
}

function spatialRecordAt(line: number, targetStart: number, targetEnd: number): SpatialRecord {
  return {
    self: span(line, 0, line, 34),
    fields: {
      target: span(line, targetStart, line, targetEnd),
      x: span(line, 0, line, 0),
      y: span(line, 0, line, 0),
      w: span(line, 0, line, 0),
      h: span(line, 0, line, 0),
    },
  };
}

function span(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number
): SourceSpan {
  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  };
}
