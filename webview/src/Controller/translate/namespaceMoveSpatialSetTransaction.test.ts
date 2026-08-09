import { describe, expect, it } from "vitest";
import type { EditorCommandTransaction } from "../../View/commands";
import { toClassId, toDiagramId, toNamespaceId } from "../../shared/ids";
import type { SpatialAttachment } from "../../shared/geometry";
import type { ClassNode, DiagramGraph, NamespaceNode } from "../model/diagramGraph";
import type { ProvenanceIndex, SpatialRecord } from "../model/provenanceIndex";
import type { SourceSpan } from "../model/sourceEdit";
import { translateCommands } from "./translateCommands";
import { validateTransaction } from "./validateTransaction";

describe("namespace move spatial-set transaction", () => {
  it("validates and translates multiple distinct class spatial updates", () => {
    const userId = toClassId("User");
    const orderId = toClassId("Order");
    const graph = graphWithClasses([
      classNode("User", toNamespaceId("Root"), spatial(100, 120, 80, 40)),
      classNode("Order", toNamespaceId("Root.Child"), spatial(200, 140, 90, 50)),
    ]);
    const provenance = provenanceWithSpatial([userId, orderId]);
    const transaction: EditorCommandTransaction = [
      {
        type: "class.spatial.set",
        classId: userId,
        spatial: { position: { x: 111, y: 119 }, size: { width: 80, height: 40 } },
      },
      {
        type: "class.spatial.set",
        classId: orderId,
        spatial: { position: { x: 211, y: 139 }, size: { width: 90, height: 50 } },
      },
    ];

    expect(validateTransaction(transaction, graph)).toEqual([]);
    expect(translateCommands(transaction, graph, provenance, "").intents).toEqual([
      replaceSpatial(userId, "x", "111"),
      replaceSpatial(userId, "y", "119"),
      replaceSpatial(userId, "w", "80"),
      replaceSpatial(userId, "h", "40"),
      replaceSpatial(orderId, "x", "211"),
      replaceSpatial(orderId, "y", "139"),
      replaceSpatial(orderId, "w", "90"),
      replaceSpatial(orderId, "h", "50"),
    ]);
  });
});

function graphWithClasses(classes: readonly ClassNode[]): DiagramGraph {
  const root = namespaceNode("Root", null);
  const child = namespaceNode("Root.Child", root.id);
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map(classes.map((node) => [node.id, node])),
    namespaces: new Map([
      [root.id, root],
      [child.id, child],
    ]),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function namespaceNode(name: string, parentNamespaceId: NamespaceNode["parentNamespaceId"]) {
  return {
    kind: "namespace" as const,
    id: toNamespaceId(name),
    name,
    label: name,
    parentNamespaceId,
    style: null,
  };
}

function classNode(
  name: string,
  parentNamespaceId: ClassNode["parentNamespaceId"],
  classSpatial: SpatialAttachment
): ClassNode {
  return {
    kind: "class",
    id: toClassId(name),
    name,
    label: name,
    genericType: null,
    annotation: null,
    parentNamespaceId,
    spatial: classSpatial,
    attributes: [],
    methods: [],
    lollipopInterfaces: [],
    directStyle: null,
    interaction: null,
  };
}

function spatial(x: number, y: number, width: number, height: number): SpatialAttachment {
  return { position: { x, y }, size: { width, height } };
}

function provenanceWithSpatial(classIds: readonly ClassNode["id"][]): ProvenanceIndex {
  return {
    diagram: {
      self: span(),
      header: span(),
      body: span(),
      direction: null,
      configDirectives: [],
    },
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
    classSpatial: new Map(classIds.map((classId) => [classId, spatialRecord()])),
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}

function spatialRecord(): SpatialRecord {
  return {
    self: span(),
    fields: {
      target: span(),
      x: span(),
      y: span(),
      w: span(),
      h: span(),
    },
  };
}

function span(): SourceSpan {
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 0 },
  };
}

function replaceSpatial(classId: ClassNode["id"], coord: "x" | "y" | "w" | "h", payload: string) {
  return {
    kind: "replaceValue" as const,
    target: {
      kind: "spatialCoord" as const,
      target: { kind: "class" as const, classId },
      coord,
    },
    payload,
  };
}
