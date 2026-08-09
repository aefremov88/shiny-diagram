import { describe, expect, it } from "vitest";
import { toDiagramId, toStyleDefId } from "../../shared/ids";
import type { DiagramGraph } from "../model/diagramGraph";
import type { ProvenanceIndex } from "../model/provenanceIndex";
import type { SourceSpan } from "../model/sourceEdit";
import { translateCommands } from "./translateCommands";

describe("style identity outcome", () => {
  it("reports a created style ID", () => {
    const result = translateCommands(
      [
        {
          type: "style.definition.create",
          name: "style1",
          sourceKind: "classDef",
          properties: {
            fill: "#ffffff",
            stroke: null,
            strokeWidth: null,
            strokeDasharray: null,
            color: null,
          },
          applyToClassIds: [],
        },
      ],
      emptyGraph(),
      emptyProvenance(),
      "classDiagram\n"
    );

    expect(result.outcome.styles.created).toEqual([toStyleDefId("style1")]);
  });

  it("reports a renamed style ID", () => {
    const result = translateCommands(
      [
        {
          type: "style.definition.name.set",
          styleDefId: toStyleDefId("Before"),
          name: "After",
        },
      ],
      emptyGraph(),
      emptyProvenance(),
      "classDiagram\n"
    );

    expect(result.outcome.styles.renamed).toEqual([
      { from: toStyleDefId("Before"), to: toStyleDefId("After") },
    ]);
  });
});

function emptyGraph(): DiagramGraph {
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map(),
    namespaces: new Map(),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function emptyProvenance(): ProvenanceIndex {
  return {
    diagram: {
      self: span(),
      header: span(),
      body: span(),
      direction: null,
      configDirectives: [],
    },
    classes: new Map(),
    namespaces: new Map(),
    namespaceStyles: new Map(),
    blockMembers: new Map(),
    shortMembers: new Map(),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map(),
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}

function span(): SourceSpan {
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 0 },
  };
}
