import { describe, expect, it } from "vitest";
import { toClassId } from "../../src/shared/ids";
import { expectWriteback } from "../helpers/writeback";

const spatial = { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } };

describe("preamble round trips", () => {
  it("class.spatial.set preserves the config directive statement byte-identically", () => {
    const directive = '%%{init: {"class": {"hideEmptyMembersBox": true}}}%%';
    const source = `${directive}\nclassDiagram\nclass User\n`;
    expectWriteback({ type: "class.spatial.set", classId: toClassId("User"), spatial }, source, {
      targetLines: [/@spatial:User/],
      assertGraph: (graph, result) => {
        expect(graph.classes.get(toClassId("User"))?.spatial).not.toBeNull();
        expect(result.split("\n")[0]).toBe(directive);
      },
    });
  });

  it("class.spatial.set preserves the direction statement byte-identically", () => {
    const source = `classDiagram\n  direction LR\nclass User\n`;
    expectWriteback({ type: "class.spatial.set", classId: toClassId("User"), spatial }, source, {
      targetLines: [/@spatial:User/],
      assertGraph: (graph, result) => {
        expect(graph.diagram.direction).toBe("LR");
        expect(result.split("\n")[1]).toBe("  direction LR");
      },
    });
  });
});
