import { describe, expect, it } from "vitest";
import { toClassId, toRelationshipId } from "../../shared/ids";
import type { DiagramGraph } from "../model/diagramGraph";
import { deriveRelationshipViews } from "./workers/deriveRelationshipViews";

describe("deriveRelationshipViews", () => {
  it("returns relationships regardless of endpoint spatial state", () => {
    const sourceClassId = toClassId("Parent");
    const targetClassId = toClassId("Child");
    const graph = {
      relationships: new Map([
        [
          toRelationshipId("relationship:0"),
          {
            id: toRelationshipId("relationship:0"),
            source: {
              classId: sourceClassId,
              endpointKind: "triangle",
              multiplicity: null,
            },
            target: {
              classId: targetClassId,
              endpointKind: "none",
              multiplicity: null,
            },
            lineKind: "solid",
            label: null,
          },
        ],
      ]),
    } as unknown as DiagramGraph;

    expect(deriveRelationshipViews(graph)).toEqual([
      expect.objectContaining({
        sourceClassId,
        targetClassId,
        sourceEndpointKind: "triangle",
        targetEndpointKind: "none",
      }),
    ]);
  });
});
