import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveDiagramView } from "../../src/Controller/deriveViews";
import { parseDiagram } from "../../src/Controller/parse";
import { toClassId } from "../../src/shared/ids";
import { expectWriteback } from "../helpers/writeback";

const parse = (name: string) =>
  parseDiagram(readFileSync(new URL(`../fixtures/${name}.mmd`, import.meta.url), "utf8"));

describe("invalid Mermaid handling", () => {
  it("unknown statement", () => expect(parse("unknown-statement").status).toBe("invalidSyntax"));
  it.fails("misplaced statement", () =>
    expect(parse("misplaced-statement").status).toBe("invalidSyntax")
  );
  it.fails("malformed statement", () =>
    expect(parse("malformed-statement").status).toBe("invalidSyntax")
  );
  it("lollipop interface statement", () => {
    const source = readFileSync(
      new URL("../fixtures/lollipop-interface-statement.mmd", import.meta.url),
      "utf8"
    );
    const result = parse("lollipop-interface-statement");
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      const view = deriveDiagramView(result.graph);
      expect(view.relationships).toEqual([]);
      expect(JSON.stringify(view)).not.toContain("lollipop");
    }

    const lollipopLine = "Service ()-- Client";
    expectWriteback(
      {
        type: "class.spatial.set",
        classId: toClassId("Service"),
        spatial: { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } },
      },
      source,
      {
        targetLines: [/@spatial:Service/],
        assertGraph: (_graph, resultingSource) => {
          expect(resultingSource.split("\n").filter((line) => line.includes("()--"))).toEqual([
            lollipopLine,
          ]);
        },
      }
    );
  });
  it("default style definition", () => {
    const result = parse("default-style-definition");
    expect(["ready", "missingAnnotations"]).toContain(result.status);
    if (result.status === "ready" || result.status === "missingAnnotations") {
      expect(result.graph.styleDefinitions.size).toBe(0);
    }
  });
});
