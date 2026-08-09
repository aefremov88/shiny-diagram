import { describe, expect, it } from "vitest";
import { parseDiagram } from "./parseDiagram";

describe("style occurrences", () => {
  it("preserves source order across declared, direct, and namespace styles", () => {
    const result = parseDiagram(`classDiagram
classDef Accent fill:#ABC,stroke:#123,color:#fff
style User fill:#ffb6c1,stroke:#456
namespace Domain {
  class User
}
%% @style:Domain fill=#def stroke=#789 color=#222
`);

    expect(result.status).not.toBe("invalidSyntax");
    if (result.status === "invalidSyntax" || result.status === "unsupportedDiagramType") return;

    expect(result.graph.styleOccurrences).toEqual([
      {
        kind: "declared",
        styleDefId: "Accent",
        name: "Accent",
        properties: {
          fill: "#ABC",
          stroke: "#123",
          strokeWidth: null,
          strokeDasharray: null,
          color: "#fff",
        },
      },
      {
        kind: "direct",
        classId: "User",
        properties: {
          fill: "#ffb6c1",
          stroke: "#456",
          strokeWidth: null,
          strokeDasharray: null,
          color: null,
        },
      },
      {
        kind: "namespace",
        namespaceId: "Domain",
        properties: {
          fill: "#def",
          stroke: "#789",
          strokeWidth: null,
          strokeDasharray: null,
          color: "#222",
        },
      },
    ]);
  });

  it("keeps Mermaid classDef default outside the semantic style catalog", () => {
    const result = parseDiagram(`classDiagram
classDef default fill:pink
class User
`);
    expect(result.status).not.toBe("invalidSyntax");
    if (result.status === "invalidSyntax" || result.status === "unsupportedDiagramType") return;

    expect(result.graph.styleDefinitions.size).toBe(0);
    expect(result.graph.styleOccurrences).toEqual([]);
    expect(result.provenance.styleDefinitions.size).toBe(0);
  });
});
