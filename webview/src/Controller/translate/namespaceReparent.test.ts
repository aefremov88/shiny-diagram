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
import { translateCommands } from "./translateCommands";

describe("namespace reparent translation", () => {
  it("renames the moved namespace identity and rewrites its style target", () => {
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
    const result = translateCommands(
      [
        {
          type: "namespace.parentNamespace.set",
          namespaceId: toNamespaceId("A.B"),
          parentNamespaceId: null,
        },
      ],
      graphWith({
        classes: [classNode("X", "A.B"), classNode("Y", "A")],
        namespaces: [namespaceNode("A", null), namespaceNode("A.B", "A")],
      }),
      provenanceForReparent({ styledDescendant: false }),
      source
    );

    expect(result.outcome.namespaces.renamed).toEqual([
      { from: toNamespaceId("A.B"), to: toNamespaceId("B") },
    ]);
    expect(result.intents).toContainEqual({
      kind: "replaceValue",
      target: { kind: "namespaceStyleTarget", namespaceId: toNamespaceId("A.B") },
      payload: "B",
    });
  });

  it("cascades namespace reparent identity through styled descendants", () => {
    const source = `classDiagram
namespace A {
  namespace B {
    namespace C {
      class X
    }
  }
}
%% @style:A.B fill=blue
%% @style:A.B.C fill=green
`;
    const result = translateCommands(
      [
        {
          type: "namespace.parentNamespace.set",
          namespaceId: toNamespaceId("A.B"),
          parentNamespaceId: null,
        },
      ],
      graphWith({
        classes: [classNode("X", "A.B.C")],
        namespaces: [
          namespaceNode("A", null),
          namespaceNode("A.B", "A"),
          namespaceNode("A.B.C", "A.B"),
        ],
      }),
      provenanceForCascade(),
      source
    );

    expect(result.outcome.namespaces.renamed).toEqual([
      { from: toNamespaceId("A.B"), to: toNamespaceId("B") },
      { from: toNamespaceId("A.B.C"), to: toNamespaceId("B.C") },
    ]);
    expect(result.intents).toContainEqual({
      kind: "replaceValue",
      target: { kind: "namespaceStyleTarget", namespaceId: toNamespaceId("A.B") },
      payload: "B",
    });
    expect(result.intents).toContainEqual({
      kind: "replaceValue",
      target: { kind: "namespaceStyleTarget", namespaceId: toNamespaceId("A.B.C") },
      payload: "B.C",
    });
  });

  it("does not report identity deltas for class reparent", () => {
    const result = translateCommands(
      [{ type: "class.parentNamespace.set", classId: toClassId("X"), parentNamespaceId: null }],
      graphWith({
        classes: [classNode("X", "A")],
        namespaces: [namespaceNode("A", null)],
      }),
      provenanceForClassReparent(),
      "classDiagram\nnamespace A {\n  class X\n}\n"
    );

    expect(result.outcome.namespaces.renamed).toEqual([]);
    expect(result.outcome.classes.renamed).toEqual([]);
  });
});

function graphWith(input: {
  readonly classes: readonly ClassNode[];
  readonly namespaces: readonly NamespaceNode[];
}): DiagramGraph {
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map(input.classes.map((node) => [node.id, node])),
    namespaces: new Map(input.namespaces.map((node) => [node.id, node])),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function classNode(name: string, parentNamespaceId: string): ClassNode {
  return {
    kind: "class",
    id: toClassId(name),
    name,
    label: name,
    genericType: null,
    annotation: null,
    parentNamespaceId: toNamespaceId(parentNamespaceId),
    spatial: null,
    attributes: [],
    methods: [],
    lollipopInterfaces: [],
    directStyle: null,
    interaction: null,
  };
}

function namespaceNode(name: string, parentNamespaceId: string | null): NamespaceNode {
  return {
    kind: "namespace",
    id: toNamespaceId(name),
    name,
    label: name.slice(name.lastIndexOf(".") + 1),
    parentNamespaceId: parentNamespaceId ? toNamespaceId(parentNamespaceId) : null,
    style: null,
  };
}

function provenanceForReparent({
  styledDescendant,
}: {
  readonly styledDescendant: boolean;
}): ProvenanceIndex {
  return provenanceWith({
    classes: [
      [toClassId("X"), classRecord(6, 4, 11)],
      [toClassId("Y"), classRecord(4, 2, 9)],
    ],
    namespaces: [
      [toNamespaceId("A"), namespaceRecord(3, 0, 8, 1, 10, 11)],
      [toNamespaceId("A.B"), namespaceRecord(5, 2, 7, 3, 12, 13)],
    ],
    namespaceStyles: [
      [toNamespaceId("A.B"), namespaceStyleRecord(9, 10, 13, 14, 23)],
      ...(styledDescendant
        ? ([[toNamespaceId("A.B.C"), namespaceStyleRecord(10, 10, 15, 16, 27)]] as const)
        : []),
    ],
    classSpatial: [
      [toClassId("X"), spatialRecord(1, 12, 13)],
      [toClassId("Y"), spatialRecord(2, 12, 13)],
    ],
  });
}

function provenanceForCascade(): ProvenanceIndex {
  return provenanceWith({
    classes: [[toClassId("X"), classRecord(4, 6, 13)]],
    namespaces: [
      [toNamespaceId("A"), namespaceRecord(1, 0, 7, 1, 10, 11)],
      [toNamespaceId("A.B"), namespaceRecord(2, 2, 6, 3, 12, 13)],
      [toNamespaceId("A.B.C"), namespaceRecord(3, 4, 5, 5, 14, 15)],
    ],
    namespaceStyles: [
      [toNamespaceId("A.B"), namespaceStyleRecord(8, 10, 13, 14, 23)],
      [toNamespaceId("A.B.C"), namespaceStyleRecord(9, 10, 15, 16, 27)],
    ],
  });
}

function provenanceForClassReparent(): ProvenanceIndex {
  return provenanceWith({
    classes: [[toClassId("X"), classRecord(2, 2, 9)]],
    namespaces: [[toNamespaceId("A"), namespaceRecord(1, 0, 3, 1, 10, 11)]],
  });
}

function provenanceWith(
  input: Partial<{
    readonly classes: readonly (readonly [ClassNode["id"], ClassRecord])[];
    readonly namespaces: readonly (readonly [NamespaceNode["id"], NamespaceRecord])[];
    readonly namespaceStyles: readonly (readonly [NamespaceNode["id"], NamespaceStyleRecord])[];
    readonly classSpatial: readonly (readonly [ClassNode["id"], SpatialRecord])[];
  }>
): ProvenanceIndex {
  return {
    diagram: {
      self: span(0, 0, 10, 0),
      header: span(0, 0, 0, 12),
      body: span(1, 0, 10, 0),
      direction: null,
      configDirectives: [],
    },
    classes: new Map(input.classes ?? []),
    namespaces: new Map(input.namespaces ?? []),
    namespaceStyles: new Map(input.namespaceStyles ?? []),
    blockMembers: new Map(),
    shortMembers: new Map(),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map(input.classSpatial ?? []),
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

function namespaceStyleRecord(
  line: number,
  targetStart: number,
  targetEnd: number,
  propertyStart: number,
  propertyEnd: number
): NamespaceStyleRecord {
  return {
    self: span(line, 0, line, propertyEnd),
    fields: {
      target: span(line, targetStart, line, targetEnd),
      propertyList: span(line, propertyStart, line, propertyEnd),
    },
  };
}

function spatialRecord(line: number, targetStart: number, targetEnd: number): SpatialRecord {
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
