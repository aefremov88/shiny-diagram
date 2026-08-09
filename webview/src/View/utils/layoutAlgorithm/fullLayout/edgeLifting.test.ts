import { describe, expect, it } from "vitest";
import { emptyInput, classId, layoutClass, namespaceId, relationshipId } from "../testFixtures";
import { liftRelationshipEdges } from "./edgeLifting";

const rel = (
  id: string,
  source: string,
  target: string,
  sourceKind = "none",
  targetKind = "none"
) => ({
  id: relationshipId(id),
  sourceClassId: classId(source),
  targetClassId: classId(target),
  sourceEndpointKind: sourceKind as "none",
  targetEndpointKind: targetKind as "none",
});

describe("edgeLifting", () => {
  const namespaces = [
    {
      id: namespaceId("N"),
      parentNamespaceId: null,
      memberClassIds: [classId("A")],
      childNamespaceIds: [namespaceId("C")],
    },
    {
      id: namespaceId("C"),
      parentNamespaceId: namespaceId("N"),
      memberClassIds: [classId("B"), classId("D")],
      childNamespaceIds: [],
    },
  ];
  const classes = [
    layoutClass("A", "N"),
    layoutClass("B", "C"),
    layoutClass("D", "C"),
    layoutClass("T"),
  ];

  it("attaches an edge only at its LCA level", () => {
    const input = emptyInput({ classes, namespaces, relationships: [rel("r", "A", "B")] });
    expect(liftRelationshipEdges(input, namespaceId("N"))).toHaveLength(1);
    expect(liftRelationshipEdges(input, null)).toHaveLength(0);
  });

  it("lifts nested and root-crossing representatives", () => {
    const input = emptyInput({ classes, namespaces, relationships: [rel("r", "B", "T")] });
    expect(liftRelationshipEdges(input, null)[0]).toMatchObject({ sourceId: "N", targetId: "T" });
  });

  it("merges parallel lifted edges and drops post-lift self edges", () => {
    const input = emptyInput({
      classes,
      namespaces,
      relationships: [rel("one", "A", "T"), rel("two", "B", "T"), rel("self", "B", "D")],
    });
    expect(liftRelationshipEdges(input, null)).toEqual([
      expect.objectContaining({ sourceId: "N", targetId: "T", weight: 2 }),
    ]);
    expect(liftRelationshipEdges(input, namespaceId("N"))).toHaveLength(0);
  });

  it("uses the first relationship direction to break a tie", () => {
    const input = emptyInput({
      classes: [layoutClass("A"), layoutClass("B")],
      relationships: [rel("first", "B", "A"), rel("second", "A", "B")],
    });
    expect(liftRelationshipEdges(input, null)[0]).toMatchObject({ sourceId: "B", targetId: "A" });
  });
});
