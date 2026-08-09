import { describe, expect, it } from "vitest";
import { classId, relationshipId } from "../testFixtures";
import { normalizeRelationship } from "./rankNormalization";

const relationship = (source: string, target: string) => ({
  id: relationshipId("r"),
  sourceClassId: classId("A"),
  targetClassId: classId("B"),
  sourceEndpointKind: source as "none",
  targetEndpointKind: target as "none",
});

describe("rankNormalization", () => {
  it.each([
    ["triangle", "none", "A", "B"],
    ["composition", "none", "A", "B"],
    ["aggregation", "none", "A", "B"],
    ["none", "triangle", "B", "A"],
    ["none", "none", "A", "B"],
    ["triangle", "composition", "A", "B"],
    ["arrow", "none", "A", "B"],
  ])("normalizes %s / %s", (source, target, expectedSource, expectedTarget) => {
    expect(normalizeRelationship(relationship(source, target))).toEqual({
      sourceId: expectedSource,
      targetId: expectedTarget,
    });
  });

  it("excludes lollipops and self relationships", () => {
    expect(normalizeRelationship(relationship("lollipop", "none"))).toBeNull();
    expect(
      normalizeRelationship({ ...relationship("none", "none"), targetClassId: classId("A") })
    ).toBeNull();
  });
});
