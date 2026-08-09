import { describe, expect, it } from "vitest";
import type { EditorCommandTransaction } from "../../View/commands";
import { toClassId, toDiagramId, toNamespaceId } from "../../shared/ids";
import type { ClassNode, DiagramGraph, NamespaceNode } from "../model/diagramGraph";
import type { ProvenanceIndex, SourceSpan } from "../model/provenanceIndex";
import { translateCommands } from "./translateCommands";

describe("vacancy post-pass", () => {
  it("deletes an emptied namespace and its style annotation without overlapping moved child deletes", () => {
    const classId = toClassId("User");
    const namespaceId = toNamespaceId("Root");
    const graph = graphWith({
      classes: [classNode("User", namespaceId)],
      namespaces: [namespaceNode("Root", null)],
    });
    const source = `classDiagram
namespace Root {
  class User
}
%% @style:Root fill=#eef stroke=#48f
`;
    const transaction: EditorCommandTransaction = [
      { type: "class.parentNamespace.set", classId, parentNamespaceId: null },
    ];

    const intents = translateCommands(transaction, graph, provenance(), source).intents;

    expect(intents).toContainEqual({
      kind: "insertStatement",
      payload: "class User",
      anchor: { kind: "afterDifferentKind", statement: { kind: "namespaceStyle", namespaceId } },
    });
    expect(intents).toContainEqual({
      kind: "deleteStatement",
      target: { kind: "class", classId },
    });
    expect(intents).toContainEqual({
      kind: "deleteRange",
      target: span(1, 0, 2, 0),
    });
    expect(intents).toContainEqual({
      kind: "deleteRange",
      target: span(3, 0, 4, 0),
    });
    expect(intents).toContainEqual({
      kind: "deleteStatement",
      target: { kind: "namespaceStyle", namespaceId },
    });
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

function classNode(name: string, parentNamespaceId: ClassNode["parentNamespaceId"]): ClassNode {
  return {
    kind: "class",
    id: toClassId(name),
    name,
    label: name,
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
  name: string,
  parentNamespaceId: NamespaceNode["parentNamespaceId"]
): NamespaceNode {
  return {
    kind: "namespace",
    id: toNamespaceId(name),
    name,
    label: name,
    parentNamespaceId,
    style: null,
  };
}

function provenance(): ProvenanceIndex {
  const classId = toClassId("User");
  const namespaceId = toNamespaceId("Root");
  return {
    diagram: {
      self: span(0, 0, 4, 0),
      header: span(0, 0, 0, 12),
      body: span(1, 0, 4, 0),
      direction: null,
      configDirectives: [],
    },
    classes: new Map([
      [
        classId,
        {
          self: span(2, 2, 2, 12),
          header: span(2, 2, 2, 12),
          body: null,
          fields: { declaredName: span(2, 8, 2, 12) },
        },
      ],
    ]),
    namespaces: new Map([
      [
        namespaceId,
        {
          self: span(1, 0, 3, 1),
          header: span(1, 0, 1, 16),
          body: span(2, 0, 2, 0),
          fields: { declaredName: span(1, 10, 1, 14) },
        },
      ],
    ]),
    namespaceStyles: new Map([
      [
        namespaceId,
        {
          self: span(4, 0, 4, 35),
          fields: { target: span(4, 10, 4, 14), propertyList: span(4, 15, 4, 35) },
        },
      ],
    ]),
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
