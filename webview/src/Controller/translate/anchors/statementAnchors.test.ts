import { describe, expect, it } from "vitest";
import type { DiagramGraph } from "../../model/diagramGraph";
import type { ProvenanceIndex } from "../../model/provenanceIndex";
import { anchorAfterKindListExcluding } from "./statementAnchors";

describe("config-directive statement identity", () => {
  it("distinguishes directives by parse index", () => {
    const first = span(1, 10);
    const second = span(2, 20);
    const provenance = {
      diagram: {
        self: span(0, 20),
        header: span(0, 12),
        body: span(1, 20),
        direction: null,
        configDirectives: [first, second],
      },
    } as unknown as ProvenanceIndex;

    expect(
      anchorAfterKindListExcluding(
        {} as DiagramGraph,
        provenance,
        { kind: "diagram" },
        ["configDirective"],
        [{ kind: "configDirective", index: 0 }]
      )
    ).toEqual({ kind: "configDirective", index: 1 });
  });
});

function span(line: number, character: number) {
  return {
    start: { line, character: 0 },
    end: { line, character },
  };
}
