import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDiagram } from "../../src/Controller/parse";
import { toClassId, toNamespaceId } from "../../src/shared/ids";

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/${name}.mmd`, import.meta.url), "utf8");
const graph = (name: string) => {
  const result = parseDiagram(fixture(name));
  expect(["ready", "missingAnnotations"]).toContain(result.status);
  if (result.status !== "ready" && result.status !== "missingAnnotations") throw new Error(name);
  return result.graph;
};

describe("valid Mermaid is valid Shiny", () => {
  it("config directive statement", () => {
    const result = parseDiagram(fixture("config-directive-statement"));
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.provenance.diagram.configDirectives).toHaveLength(1);
    }
  });
  it("diagram statement", () => {
    expect(graph("diagram-statement").diagram.kind).toBe("classDiagram");
    for (const blank of ["", "\n", " \r\n\t\r\n"]) {
      const parsed = parseDiagram(blank);
      expect(parsed.status).toBe("ready");
      if (parsed.status === "ready") expect(parsed.graph.classes.size).toBe(0);
    }
  });
  it("direction statement", () =>
    expect(graph("direction-statement").diagram.direction).toBe("LR"));
  it("class declaration statement", () => {
    expect(graph("class-declaration-statement").classes.has(toClassId("User"))).toBe(true);
    for (const label of ["Opening { brace", "Closing } brace", "{braces}"]) {
      expect(parseDiagram(`classDiagram\nclass A["${label}"]\n`).status).toBe("missingAnnotations");
    }
  });
  it("namespace declaration statement", () =>
    expect(graph("namespace-declaration-statement").namespaces.has(toNamespaceId("Domain"))).toBe(
      true
    ));
  it("block member statement", () =>
    expect(graph("block-member-statement").classes.get(toClassId("User"))?.attributes).toHaveLength(
      1
    ));
  it("short member statement", () =>
    expect(graph("short-member-statement").classes.get(toClassId("User"))?.attributes).toHaveLength(
      1
    ));
  it("class annotation statement", () =>
    expect(graph("class-annotation-statement").classes.get(toClassId("User"))?.annotation).toBe(
      "interface"
    ));
  it("relationship statement", () =>
    expect(graph("relationship-statement").relationships.size).toBe(1));
  it("lollipop interface statement", () => {
    const parsed = graph("lollipop-interface-statement");
    expect(parsed.relationships.size).toBe(0);
    expect(parsed.classes.get(toClassId("Service"))?.lollipopInterfaces).toHaveLength(0);
  });
  it("style definition statement", () =>
    expect(graph("style-definition-statement").styleDefinitions.size).toBe(1));
  it("style application statement", () =>
    expect(graph("style-application-statement").styleApplications.size).toBe(1));
  it("direct style statement", () =>
    expect(graph("direct-style-statement").styleOccurrences.length).toBeGreaterThan(0));
  it("namespace style annotation statement", () =>
    expect(
      graph("namespace-style-annotation-statement").namespaces.get(toNamespaceId("Domain"))?.style
    ).toBeDefined());
  it("spatial annotation statement", () =>
    expect(
      graph("spatial-annotation-statement").classes.get(toClassId("User"))?.spatial
    ).not.toBeNull());
  it("note statement", () => expect(graph("note-statement").notes.size).toBe(1));
  it("note annotation statement", () =>
    expect([...graph("note-annotation-statement").notes.values()][0]?.spatial).not.toBeNull());
});
