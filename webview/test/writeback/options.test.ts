import { describe, expect, it } from "vitest";
import type { EditorCommand } from "../../src/View/commands";
import type { DiagramGraph } from "../../src/Controller/model/diagramGraph";
import { composeNoteId } from "../../src/Controller/model/noteIdentity";
import { parseDiagram } from "../../src/Controller/parse";
import { toClassId, toNamespaceId, toStyleDefId } from "../../src/shared/ids";
import { expectWriteback } from "../helpers/writeback";

const alpha = toClassId("Alpha");
const beta = toClassId("Beta");
const domain = toNamespaceId("Domain");
const spatial = { position: { x: 40, y: 50 }, size: { width: 160, height: 80 } };
const style = (fill: string | null) => ({
  fill,
  stroke: null,
  strokeWidth: null,
  strokeDasharray: null,
  color: null,
});

const rich = `classDiagram
%% plain comment
class Alpha~T~["label"] {
  <<interface>>
  +field
  +method()
}
class Beta {
  +other
  +otherMethod()
}
namespace Domain {
  class Nested
}
Alpha  "1"  -->  "*"  Beta : knows
classDef warning fill:#f00
class Alpha:::warning
style Alpha fill:#fff
%% @style:Domain fill=blue
%% @spatial:Alpha x=0 y=0 w=160 h=80
%% @spatial:Beta x=200 y=0 w=160 h=80
%% @spatial:Nested x=0 y=200 w=160 h=80
%% @note: x=0 y=400 w=120 h=60
note "remember"
%% unknown-extension: untouched
`;

const sparse = `classDiagram
%% plain comment
class Alpha
class Beta
namespace Domain {
  class Nested
}
Alpha   -->   Beta
classDef warning fill:#f00
%% @spatial:Beta x=200 y=0 w=160 h=80
%% @spatial:Nested x=0 y=200 w=160 h=80
note "remember"
%% unknown-extension: untouched
`;

type Option = {
  title: string;
  source: string;
  command: (graph: DiagramGraph) => EditorCommand;
  check: (graph: DiagramGraph, source: string) => void;
  targets: RegExp[];
};

const options: Option[] = [
  {
    title: "class.label.set — b. class label absent and new label non-null",
    source: sparse,
    command: () => ({ type: "class.label.set", classId: alpha, label: "new" }),
    targets: [/class Alpha/],
    check: (g) => expect(g.classes.get(alpha)?.label).toBe("new"),
  },
  {
    title: "class.label.set — c. otherwise",
    source: rich,
    command: () => ({ type: "class.label.set", classId: alpha, label: null }),
    targets: [/class Alpha/],
    check: (_g, s) => expect(s).not.toContain('["label"]'),
  },
  {
    title: "class.annotation.set — b. class annotation absent and class body written",
    source: rich.replace("  <<interface>>\n", ""),
    command: () => ({ type: "class.annotation.set", classId: alpha, annotation: "abstract" }),
    targets: [/class Alpha/, /<<abstract>>/],
    check: (g) => expect(g.classes.get(alpha)?.annotation).toBe("abstract"),
  },
  {
    title: "class.annotation.set — c. otherwise",
    source: sparse,
    command: () => ({ type: "class.annotation.set", classId: alpha, annotation: "abstract" }),
    targets: [/class Alpha/, /<<abstract>>/],
    check: (g) => expect(g.classes.get(alpha)?.annotation).toBe("abstract"),
  },
  {
    title: "class.spatial.set — b. spatial annotation absent and new spatial data non-null",
    source: sparse,
    command: () => ({ type: "class.spatial.set", classId: alpha, spatial }),
    targets: [/@spatial:Alpha/],
    check: (g) => expect(g.classes.get(alpha)?.spatial).not.toBeNull(),
  },
  {
    title: "class.spatial.set — c. otherwise",
    source: rich,
    command: () => ({ type: "class.spatial.set", classId: alpha, spatial: null }),
    targets: [/@spatial:Alpha/],
    check: (g) => expect(g.classes.get(alpha)?.spatial).toBeNull(),
  },
  {
    title: "class.directStyle.property.set — b. direct style statement exists",
    source: rich,
    command: () => ({
      type: "class.directStyle.property.set",
      classId: alpha,
      property: "stroke",
      value: "red",
    }),
    targets: [/style Alpha/],
    check: (_g, s) => expect(s).toContain("stroke:red"),
  },
  {
    title: "class.directStyle.property.set — c. otherwise",
    source: sparse,
    command: () => ({
      type: "class.directStyle.property.set",
      classId: alpha,
      property: "fill",
      value: "red",
    }),
    targets: [/style Alpha/],
    check: (_g, s) => expect(s).toContain("style Alpha fill:red"),
  },
  {
    title:
      "class.appliedStyle.set — a. style application statement exists and new style definition is null",
    source: rich,
    command: () => ({ type: "class.appliedStyle.set", classId: alpha, styleDefId: null }),
    targets: [/:::/],
    check: (g) => expect(g.styleApplications.size).toBe(0),
  },
  {
    title: "class.appliedStyle.set — c. otherwise",
    source: sparse,
    command: () => ({
      type: "class.appliedStyle.set",
      classId: alpha,
      styleDefId: toStyleDefId("warning"),
    }),
    targets: [/:::/],
    check: (g) => expect(g.styleApplications.size).toBe(1),
  },
  {
    title: "class.attribute.create — a. no class body and appending",
    source: sparse,
    command: () => ({
      type: "class.attribute.create",
      classId: alpha,
      text: "+new",
      classifier: null,
      beforeAttributeId: null,
    }),
    targets: [/class Alpha/, /\+new/],
    check: (g) => expect(g.classes.get(alpha)?.attributes).toHaveLength(1),
  },
  {
    title: "class.attribute.create — b. preceding attribute is a short member statement",
    source: `${rich}Alpha : +one\nAlpha : +two\n`,
    command: (g) => ({
      type: "class.attribute.create",
      classId: alpha,
      text: "+new",
      classifier: null,
      beforeAttributeId: g.classes.get(alpha)?.attributes[2]?.id ?? null,
    }),
    targets: [/Alpha : \+/],
    check: (g) => expect(g.classes.get(alpha)?.attributes).toHaveLength(4),
  },
  {
    title: "class.attribute.delete — b. otherwise",
    source: `${sparse}Alpha : +one\n`,
    command: (g) => ({
      type: "class.attribute.delete",
      attributeId: required(g.classes.get(alpha)?.attributes[0]?.id),
    }),
    targets: [/Alpha : \+one/],
    check: (g) => expect(g.classes.get(alpha)?.attributes).toHaveLength(0),
  },
  {
    title: "class.method.create — a. no class body and appending",
    source: sparse,
    command: () => ({
      type: "class.method.create",
      classId: alpha,
      text: "+new()",
      classifier: null,
      beforeMethodId: null,
    }),
    targets: [/class Alpha/, /\+new/],
    check: (g) => expect(g.classes.get(alpha)?.methods).toHaveLength(1),
  },
  {
    title: "class.method.create — b. preceding method is a short member statement",
    source: `${rich}Alpha : +one()\nAlpha : +two()\n`,
    command: (g) => ({
      type: "class.method.create",
      classId: alpha,
      text: "+new()",
      classifier: null,
      beforeMethodId: g.classes.get(alpha)?.methods[2]?.id ?? null,
    }),
    targets: [/Alpha : \+/],
    check: (g) => expect(g.classes.get(alpha)?.methods).toHaveLength(4),
  },
  {
    title: "class.method.delete — b. otherwise",
    source: `${sparse}Alpha : +one()\n`,
    command: (g) => ({
      type: "class.method.delete",
      methodId: required(g.classes.get(alpha)?.methods[0]?.id),
    }),
    targets: [/Alpha : \+one/],
    check: (g) => expect(g.classes.get(alpha)?.methods).toHaveLength(0),
  },
  {
    title:
      "relationship.source.multiplicity.set — b. source multiplicity absent and new multiplicity non-null",
    source: sparse,
    command: (g) => ({
      type: "relationship.source.multiplicity.set",
      relationshipId: first(g.relationships),
      multiplicity: "1",
    }),
    targets: [/Alpha.*Beta/],
    check: (g) => expect(firstValue(g.relationships).source.multiplicity).toBe("1"),
  },
  {
    title: "relationship.source.multiplicity.set — c. otherwise",
    source: rich,
    command: (g) => ({
      type: "relationship.source.multiplicity.set",
      relationshipId: first(g.relationships),
      multiplicity: null,
    }),
    targets: [/Alpha.*Beta/],
    check: (g) => expect(firstValue(g.relationships).source.multiplicity).toBeNull(),
  },
  {
    title:
      "relationship.target.multiplicity.set — b. target multiplicity absent and new multiplicity non-null",
    source: sparse,
    command: (g) => ({
      type: "relationship.target.multiplicity.set",
      relationshipId: first(g.relationships),
      multiplicity: "*",
    }),
    targets: [/Alpha.*Beta/],
    check: (g) => expect(firstValue(g.relationships).target.multiplicity).toBe("*"),
  },
  {
    title: "relationship.target.multiplicity.set — c. otherwise",
    source: rich,
    command: (g) => ({
      type: "relationship.target.multiplicity.set",
      relationshipId: first(g.relationships),
      multiplicity: null,
    }),
    targets: [/Alpha.*Beta/],
    check: (g) => expect(firstValue(g.relationships).target.multiplicity).toBeNull(),
  },
  {
    title: "relationship.label.set — b. label absent and new label non-null",
    source: sparse,
    command: (g) => ({
      type: "relationship.label.set",
      relationshipId: first(g.relationships),
      label: "new",
    }),
    targets: [/Alpha.*Beta/],
    check: (g) => expect(firstValue(g.relationships).label).toBe("new"),
  },
  {
    title: "relationship.label.set — c. otherwise",
    source: rich,
    command: (g) => ({
      type: "relationship.label.set",
      relationshipId: first(g.relationships),
      label: null,
    }),
    targets: [/Alpha.*Beta/],
    check: (g) => expect(firstValue(g.relationships).label).toBeNull(),
  },
  {
    title: "note.spatial.set — b. otherwise",
    source: sparse,
    command: () => ({ type: "note.spatial.set", noteId: composeNoteId(0), spatial }),
    targets: [/@note:/, /^note /],
    check: (g) => expect(firstValue(g.notes).spatial).not.toBeNull(),
  },
  {
    title:
      "namespace.style.set — a. namespace style annotation statement exists and the new style is null or has no non-null properties",
    source: rich,
    command: () => ({ type: "namespace.style.set", namespaceId: domain, style: null }),
    targets: [/@style:Domain/],
    check: (g) => expect(g.namespaces.get(domain)?.style).toBeNull(),
  },
  {
    title: "namespace.style.set — c. otherwise",
    source: sparse,
    command: () => ({ type: "namespace.style.set", namespaceId: domain, style: style("green") }),
    targets: [/@style:Domain/],
    check: (g) => expect(g.namespaces.get(domain)?.style?.fill).toBe("green"),
  },
  {
    title: "style.definition.property.set — b. style property entry absent and new value non-null",
    source: rich,
    command: () => ({
      type: "style.definition.property.set",
      styleDefId: toStyleDefId("warning"),
      property: "stroke",
      value: "red",
    }),
    targets: [/classDef warning/],
    check: (_g, s) => expect(s).toContain("stroke:red"),
  },
  {
    title: "style.definition.property.set — c. otherwise",
    source: rich,
    command: () => ({
      type: "style.definition.property.set",
      styleDefId: toStyleDefId("warning"),
      property: "fill",
      value: null,
    }),
    targets: [/classDef warning/],
    check: (_g, s) => expect(s).not.toContain("classDef warning fill:"),
  },
];

describe("write-back option branches", () => {
  it.each(options)("$title", ({ source, command, targets, check }) => {
    const graph = parseGraph(source);
    expectWriteback(command(graph), source, { targetLines: targets, assertGraph: check });
  });
});

function parseGraph(source: string): DiagramGraph {
  const parsed = parseDiagram(source);
  if (parsed.status !== "ready" && parsed.status !== "missingAnnotations")
    throw new Error(parsed.status);
  return parsed.graph;
}
function first<K>(map: ReadonlyMap<K, unknown>): K {
  return required(map.keys().next().value);
}
function firstValue<V>(map: ReadonlyMap<unknown, V>): V {
  return required(map.values().next().value);
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture identity");
  return value;
}
