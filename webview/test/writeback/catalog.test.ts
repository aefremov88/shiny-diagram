import { describe, expect, it } from "vitest";
import type { EditorCommand } from "../../src/View/commands";
import type { DiagramGraph } from "../../src/Controller/model/diagramGraph";
import { composeNoteId } from "../../src/Controller/model/noteIdentity";
import { parseDiagram } from "../../src/Controller/parse";
import { toClassId, toNamespaceId, toStyleDefId } from "../../src/shared/ids";
import { expectWriteback } from "../helpers/writeback";

const style = (fill: string | null = null) => ({
  fill,
  stroke: null,
  strokeWidth: null,
  strokeDasharray: null,
  color: null,
});
const spatial = (x = 500) => ({ position: { x, y: 100 }, size: { width: 160, height: 80 } });

const source = `classDiagram
direction LR
%% plain comment that must survive
class Alpha~T~["Alpha label"] {
  <<interface>>
  +field$
  +method()*
}
class Beta {
  +other
  +otherMethod()
}
namespace Domain {
  class Nested
}
namespace Other {
  class Gamma
}
Alpha  "1"  -->  "0..*"  Beta : knows
classDef warning fill:#f00,color:#fff
classDef alternate fill:#0f0
class Alpha:::warning
style Alpha fill:#fff,color:#000
%% @style:Domain fill=blue
%% @spatial:Alpha x=0 y=0 w=180 h=120
%% @spatial:Beta x=250 y=0 w=180 h=120
%% @spatial:Nested x=0 y=200 w=180 h=120
%% @spatial:Gamma x=250 y=200 w=180 h=120
%% @note: x=100 y=400 w=160 h=80
note for Alpha "remember"
%% unknown-extension: preserved verbatim
`;

type Case = {
  readonly title: string;
  readonly command: (graph: DiagramGraph) => EditorCommand;
  readonly targets: readonly RegExp[];
  readonly verify?: (graph: DiagramGraph, result: string) => void;
};

const alpha = toClassId("Alpha");
const beta = toClassId("Beta");
const domain = toNamespaceId("Domain");
const other = toNamespaceId("Other");

const cases: readonly Case[] = [
  {
    title: "class.create — class declaration and spatial statements",
    command: () => ({ type: "class.create", parentNamespaceId: null, spatial: spatial() }),
    targets: [/^class /, /@spatial:/],
    verify: (g) => expect(g.classes.size).toBe(5),
  },
  {
    title: "class.duplicate — declaration and spatial copies",
    command: () => ({
      type: "class.duplicate",
      sourceClassId: alpha,
      position: { x: 600, y: 200 },
    }),
    targets: [/^class /, /@spatial:/, /^style /, /:::/],
    verify: (g) => expect(g.classes.size).toBe(5),
  },
  {
    title: "class.delete — all owned statements",
    command: () => ({ type: "class.delete", classId: alpha }),
    targets: [/Alpha/, /@spatial:Alpha/],
    verify: (g) => expect(g.classes.has(alpha)).toBe(false),
  },
  {
    title: "class.name.set — class name value and references",
    command: () => ({ type: "class.name.set", classId: alpha, name: "Renamed<T>" }),
    targets: [/Alpha/],
    verify: (g) => expect(g.classes.has(toClassId("Renamed"))).toBe(true),
  },
  {
    title: "class.label.set — a. class label already written and new label non-null",
    command: () => ({ type: "class.label.set", classId: alpha, label: "Renamed label" }),
    targets: [/class Alpha/],
    verify: (g) => expect(g.classes.get(alpha)?.label).toBe("Renamed label"),
  },
  {
    title: "class.annotation.set — a. class annotation already written",
    command: () => ({ type: "class.annotation.set", classId: alpha, annotation: "abstract" }),
    targets: [/<<interface>>/],
    verify: (g) => expect(g.classes.get(alpha)?.annotation).toBe("abstract"),
  },
  {
    title:
      "class.spatial.set — a. spatial annotation already written and new spatial data non-null",
    command: () => ({ type: "class.spatial.set", classId: alpha, spatial: spatial(700) }),
    targets: [/@spatial:Alpha/],
    verify: (g) => expect(g.classes.get(alpha)?.spatial?.position.x).toBe(700),
  },
  {
    title: "class.parentNamespace.set — move source block verbatim",
    command: () => ({
      type: "class.parentNamespace.set",
      classId: alpha,
      parentNamespaceId: other,
    }),
    targets: [/class Alpha/, /^namespace Other/, /^}/],
    verify: (g) => expect(g.classes.get(alpha)?.parentNamespaceId).toBe(other),
  },
  {
    title: "class.directStyle.property.set — a. property entry already written",
    command: () => ({
      type: "class.directStyle.property.set",
      classId: alpha,
      property: "fill",
      value: "#abc",
    }),
    targets: [/style Alpha/],
    verify: (_g, s) => expect(s).toContain("fill:#abc"),
  },
  {
    title: "class.directStyle.set — written values update and entries insert or delete",
    command: () => ({ type: "class.directStyle.set", classId: alpha, properties: style("#abc") }),
    targets: [/style Alpha/],
    verify: (_g, s) => expect(s).toContain("fill:#abc"),
  },
  {
    title: "class.directStyle.clear — direct style statement deleted",
    command: () => ({ type: "class.directStyle.clear", classId: alpha }),
    targets: [/style Alpha/],
    verify: (_g, s) => expect(s).not.toContain("style Alpha"),
  },
  {
    title:
      "class.appliedStyle.set — b. style application statement exists and new style definition is non-null",
    command: () => ({
      type: "class.appliedStyle.set",
      classId: alpha,
      styleDefId: toStyleDefId("alternate"),
    }),
    targets: [/:::/],
    verify: (_g, s) => expect(s).toContain(":::alternate"),
  },
  {
    title: "class.attribute.create — c. otherwise",
    command: () => ({
      type: "class.attribute.create",
      classId: alpha,
      text: "+created",
      classifier: null,
      beforeAttributeId: null,
    }),
    targets: [/class Alpha/, /^  \+/],
    verify: (g) => expect(g.classes.get(alpha)?.attributes).toHaveLength(2),
  },
  {
    title: "class.attribute.set — member text value",
    command: (g) => ({
      type: "class.attribute.set",
      attributeId: required(g.classes.get(alpha)?.attributes[0]?.id),
      text: "+changed",
      classifier: null,
    }),
    targets: [/\+field\$/],
    verify: (g) => expect(g.classes.get(alpha)?.attributes[0]?.text).toContain("changed"),
  },
  {
    title: "class.attribute.delete — a. attribute written in block form",
    command: (g) => ({
      type: "class.attribute.delete",
      attributeId: required(g.classes.get(alpha)?.attributes[0]?.id),
    }),
    targets: [/\+field\$/],
    verify: (g) => expect(g.classes.get(alpha)?.attributes).toHaveLength(0),
  },
  {
    title: "class.attribute.move — block deletion and block insertion",
    command: (g) => ({
      type: "class.attribute.move",
      attributeId: required(g.classes.get(alpha)?.attributes[0]?.id),
      classId: beta,
      beforeAttributeId: null,
    }),
    targets: [/\+field\$/, /class Beta/, /^  \+other/],
    verify: (g) => expect(g.classes.get(beta)?.attributes).toHaveLength(2),
  },
  {
    title: "class.method.create — c. otherwise",
    command: () => ({
      type: "class.method.create",
      classId: alpha,
      text: "+created()",
      classifier: null,
      beforeMethodId: null,
    }),
    targets: [/class Alpha/, /^  \+/],
    verify: (g) => expect(g.classes.get(alpha)?.methods).toHaveLength(2),
  },
  {
    title: "class.method.set — member text value",
    command: (g) => ({
      type: "class.method.set",
      methodId: required(g.classes.get(alpha)?.methods[0]?.id),
      text: "+changed()",
      classifier: null,
    }),
    targets: [/\+method\(\)\*/],
    verify: (g) => expect(g.classes.get(alpha)?.methods[0]?.text).toContain("changed"),
  },
  {
    title: "class.method.delete — a. method written in block form",
    command: (g) => ({
      type: "class.method.delete",
      methodId: required(g.classes.get(alpha)?.methods[0]?.id),
    }),
    targets: [/\+method\(\)\*/],
    verify: (g) => expect(g.classes.get(alpha)?.methods).toHaveLength(0),
  },
  {
    title: "class.method.move — block deletion and block insertion",
    command: (g) => ({
      type: "class.method.move",
      methodId: required(g.classes.get(alpha)?.methods[0]?.id),
      classId: beta,
      beforeMethodId: null,
    }),
    targets: [/\+method\(\)\*/, /class Beta/, /^  \+other/],
    verify: (g) => expect(g.classes.get(beta)?.methods).toHaveLength(2),
  },
  {
    title: "relationship.create — relationship statement",
    command: () => ({
      type: "relationship.create",
      source: { classId: alpha, multiplicity: null, endpointKind: "none" },
      target: { classId: beta, multiplicity: null, endpointKind: "arrow" },
      lineKind: "dashed",
      label: "new",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect(g.relationships.size).toBe(2),
  },
  {
    title: "relationship.delete — relationship statement deleted",
    command: (g) => ({ type: "relationship.delete", relationshipId: first(g.relationships) }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect(g.relationships.size).toBe(0),
  },
  {
    title: "relationship.source.class.set — source endpoint value",
    command: (g) => ({
      type: "relationship.source.class.set",
      relationshipId: first(g.relationships),
      classId: toClassId("Gamma"),
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].source.classId).toBe(toClassId("Gamma")),
  },
  {
    title: "relationship.target.class.set — target endpoint value",
    command: (g) => ({
      type: "relationship.target.class.set",
      relationshipId: first(g.relationships),
      classId: toClassId("Gamma"),
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].target.classId).toBe(toClassId("Gamma")),
  },
  {
    title: "relationship.source.endpointKind.set — relationship operator value",
    command: (g) => ({
      type: "relationship.source.endpointKind.set",
      relationshipId: first(g.relationships),
      endpointKind: "aggregation",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].source.endpointKind).toBe("aggregation"),
  },
  {
    title: "relationship.target.endpointKind.set — relationship operator value",
    command: (g) => ({
      type: "relationship.target.endpointKind.set",
      relationshipId: first(g.relationships),
      endpointKind: "triangle",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].target.endpointKind).toBe("triangle"),
  },
  {
    title: "relationship.lineKind.set — relationship operator value",
    command: (g) => ({
      type: "relationship.lineKind.set",
      relationshipId: first(g.relationships),
      lineKind: "dashed",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].lineKind).toBe("dashed"),
  },
  {
    title:
      "relationship.source.multiplicity.set — a. source multiplicity already written and new multiplicity non-null",
    command: (g) => ({
      type: "relationship.source.multiplicity.set",
      relationshipId: first(g.relationships),
      multiplicity: "many",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].source.multiplicity).toBe("many"),
  },
  {
    title:
      "relationship.target.multiplicity.set — a. target multiplicity already written and new multiplicity non-null",
    command: (g) => ({
      type: "relationship.target.multiplicity.set",
      relationshipId: first(g.relationships),
      multiplicity: "many",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].target.multiplicity).toBe("many"),
  },
  {
    title: "relationship.label.set — a. label already written and new label non-null",
    command: (g) => ({
      type: "relationship.label.set",
      relationshipId: first(g.relationships),
      label: "changed",
    }),
    targets: [/Alpha.*Beta/],
    verify: (g) => expect([...g.relationships.values()][0].label).toBe("changed"),
  },
  {
    title: "note.create — annotation and note statements",
    command: () => ({
      type: "note.create",
      text: "new note",
      spatial: spatial(800),
      attachedToClassId: null,
    }),
    targets: [/@note:/, /^note /],
    verify: (g) => expect(g.notes.size).toBe(2),
  },
  {
    title: "note.delete — note and bound annotation deleted",
    command: () => ({ type: "note.delete", noteId: composeNoteId(0) }),
    targets: [/@note:/, /^note /],
    verify: (g) => expect(g.notes.size).toBe(0),
  },
  {
    title: "note.text.set — note text value",
    command: () => ({ type: "note.text.set", noteId: composeNoteId(0), text: "changed" }),
    targets: [/^note /],
    verify: (g) => expect([...g.notes.values()][0].text).toBe("changed"),
  },
  {
    title: "note.spatial.set — a. note annotation already written",
    command: () => ({ type: "note.spatial.set", noteId: composeNoteId(0), spatial: spatial(900) }),
    targets: [/@note:/],
    verify: (g) => expect([...g.notes.values()][0].spatial?.position.x).toBe(900),
  },
  {
    title: "note.attachment.set — note statement replacement",
    command: () => ({
      type: "note.attachment.set",
      noteId: composeNoteId(0),
      attachedToClassId: beta,
    }),
    targets: [/^note /],
    verify: (g) => expect([...g.notes.values()][0].attachedToClassId).toBe(beta),
  },
  {
    title: "note.duplicate — annotation and note copies",
    command: () => ({ type: "note.duplicate", noteId: composeNoteId(0) }),
    targets: [/@note:/, /^note /],
    verify: (g) => expect(g.notes.size).toBe(2),
  },
  {
    title: "namespace.create — moved declarations in new namespace",
    command: () => ({ type: "namespace.create", initialClassIds: [beta], initialNamespaceIds: [] }),
    targets: [/class Beta/, /^namespace /, /^}/],
    verify: (g) => expect(g.namespaces.size).toBe(3),
  },
  {
    title: "namespace.delete — children moved and namespace removed",
    command: () => ({ type: "namespace.delete", namespaceId: domain }),
    targets: [/Domain/, /class Nested/, /^}/],
    verify: (g) => expect(g.namespaces.has(domain)).toBe(false),
  },
  {
    title: "namespace.name.set — namespace and style targets",
    command: () => ({ type: "namespace.name.set", namespaceId: domain, name: "Renamed" }),
    targets: [/Domain/],
    verify: (g) => expect(g.namespaces.has(toNamespaceId("Renamed"))).toBe(true),
  },
  {
    title:
      "namespace.style.set — b. namespace style annotation statement exists and the new style has a non-null property",
    command: () => ({ type: "namespace.style.set", namespaceId: domain, style: style("green") }),
    targets: [/@style:Domain/],
    verify: (g) => expect(g.namespaces.get(domain)?.style?.fill).toBe("green"),
  },
  {
    title: "namespace.parentNamespace.set — declaration move and descendant rename",
    command: () => ({
      type: "namespace.parentNamespace.set",
      namespaceId: domain,
      parentNamespaceId: other,
    }),
    targets: [/Domain/, /^namespace Other/, /^}/],
    verify: (g) => expect(g.namespaces.has(toNamespaceId("Other.Domain"))).toBe(true),
  },
  {
    title: "style.definition.create — definition and applications",
    command: () => ({
      type: "style.definition.create",
      name: "fresh",
      sourceKind: "classDef",
      properties: style("#abc"),
      applyToClassIds: [beta],
    }),
    targets: [/classDef/, /:::/],
    verify: (g) => expect(g.styleDefinitions.has(toStyleDefId("fresh"))).toBe(true),
  },
  {
    title: "style.definition.delete — definition and applications deleted",
    command: () => ({ type: "style.definition.delete", styleDefId: toStyleDefId("warning") }),
    targets: [/classDef warning/, /:::warning/],
    verify: (g) => expect(g.styleDefinitions.has(toStyleDefId("warning"))).toBe(false),
  },
  {
    title: "style.definition.name.set — definition and application names",
    command: () => ({
      type: "style.definition.name.set",
      styleDefId: toStyleDefId("warning"),
      name: "renamed",
    }),
    targets: [/warning/],
    verify: (g) => expect(g.styleDefinitions.has(toStyleDefId("renamed"))).toBe(true),
  },
  {
    title:
      "style.definition.property.set — a. style property entry already written and new value non-null",
    command: () => ({
      type: "style.definition.property.set",
      styleDefId: toStyleDefId("warning"),
      property: "fill",
      value: "#abc",
    }),
    targets: [/classDef warning/],
    verify: (_g, s) => expect(s).toContain("fill:#abc"),
  },
];

describe("write-back catalog", () => {
  it.each(cases)("$title", ({ command, targets, verify }) => {
    const parsed = parseForCommand(source);
    for (const input of [source, source.replace(/\n/g, "\r\n")]) {
      expectWriteback(command(parsed), input, {
        targetLines: targets,
        assertGraph: (graph, result) => {
          expect(result).not.toBe(input);
          verify?.(graph, result);
        },
      });
    }
    const create = command(parsed);
    if (
      create.type === "class.create" ||
      create.type === "note.create" ||
      create.type === "style.definition.create"
    ) {
      const initialCommand =
        create.type === "style.definition.create" ? { ...create, applyToClassIds: [] } : create;
      for (const blank of ["", "\n", " \r\n\t\r\n"]) {
        expectWriteback(initialCommand, blank, {
          targetLines: [],
          assertGraph: (graph, result) => {
            expect(result.startsWith("classDiagram")).toBe(true);
            expect(result.match(/classDiagram/g)).toHaveLength(1);
            expect(result.endsWith(blank)).toBe(true);
            expect(parseDiagram(result).status).toBe("ready");
            if (create.type === "class.create") expect(graph.classes.size).toBe(1);
            if (create.type === "note.create") expect(graph.notes.size).toBe(1);
            if (create.type === "style.definition.create")
              expect(graph.styleDefinitions.size).toBe(1);
          },
        });
      }
    }
  });
});

function parseForCommand(text: string): DiagramGraph {
  const parsed = parseDiagram(text);
  if (parsed.status !== "ready") throw new Error(`Base fixture is ${parsed.status}`);
  return parsed.graph;
}

function first<T>(map: ReadonlyMap<T, unknown>): T {
  const value = map.keys().next().value;
  if (value === undefined) throw new Error("Expected map entry");
  return value;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected parsed identity");
  return value;
}
