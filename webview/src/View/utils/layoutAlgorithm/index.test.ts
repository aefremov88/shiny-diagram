import { describe, expect, it } from "vitest";
import { generateSpatialAssignments } from ".";
import { emptyInput } from "./testFixtures";

describe("generateSpatialAssignments", () => {
  it("is the public layout entry", () => {
    expect(generateSpatialAssignments(emptyInput())).toEqual([]);
  });
});
