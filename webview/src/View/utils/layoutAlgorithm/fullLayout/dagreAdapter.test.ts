import { describe, expect, it } from "vitest";
import { runDagre } from "./dagreAdapter";

describe("dagreAdapter", () => {
  it("returns top-left, finite coordinates and respects rank direction", () => {
    const result = runDagre(
      "TB",
      [
        { id: "A", width: 100, height: 50 },
        { id: "B", width: 100, height: 50 },
      ],
      [{ id: "r", sourceId: "A", targetId: "B", weight: 1, minlen: 1 }]
    );
    const a = result.nodes.get("A");
    const b = result.nodes.get("B");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (!a || !b) throw new Error("Expected both nodes");
    expect(a.y).toBeLessThan(b.y);
    expect([...result.nodes.values()].every((node) => Number.isFinite(node.x) && node.x >= 0)).toBe(
      true
    );
  });
});
