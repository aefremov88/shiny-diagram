import { describe, expect, it } from "vitest";
import type { EditorCommandTransaction } from "../../View/commands";
import { toClassId, toDiagramId, toNamespaceId } from "../../shared/ids";
import type { ClassNode, DiagramGraph, NamespaceNode } from "../model/diagramGraph";
import type {
  ClassRecord,
  NamespaceRecord,
  NamespaceStyleRecord,
  ProvenanceIndex,
  SourceSpan,
  SpatialRecord,
} from "../model/provenanceIndex";
import { translateCommands } from "./translateCommands";
import { validateTransaction } from "./validateTransaction";

describe("namespace properties translation", () => {
  it("renames a namespace declaration and its style target", () => {
    const source = `classDiagram
namespace Root {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
%% @style:Root fill=#eef stroke=#48f
`;
    const parsed = rootFixture({ hasStyle: true });

    const result = translateCommands(
      [{ type: "namespace.name.set", namespaceId: toNamespaceId("Root"), name: "Core" }],
      parsed.graph,
      parsed.provenance,
      source
    );

    expect(result.outcome.namespaces.renamed).toEqual([
      { from: toNamespaceId("Root"), to: toNamespaceId("Core") },
    ]);
    expect(result.intents).toEqual([
      {
        kind: "replaceValue",
        target: { kind: "namespaceName", namespaceId: toNamespaceId("Root") },
        payload: "Core",
      },
      {
        kind: "replaceValue",
        target: { kind: "namespaceStyleTarget", namespaceId: toNamespaceId("Root") },
        payload: "Core",
      },
    ]);
  });

  it("renames a synthetic dotted parent by rewriting the dotted declaration", () => {
    const source = `classDiagram
namespace Domain.Sub {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
`;
    const parsed = dottedFixture();

    const result = translateCommands(
      [{ type: "namespace.name.set", namespaceId: toNamespaceId("Domain"), name: "Core" }],
      parsed.graph,
      parsed.provenance,
      source
    );

    expect(result.outcome.namespaces.renamed).toEqual([
      { from: toNamespaceId("Domain"), to: toNamespaceId("Core") },
      { from: toNamespaceId("Domain.Sub"), to: toNamespaceId("Core.Sub") },
    ]);
    expect(result.intents).toEqual([
      {
        kind: "replaceValue",
        target: { kind: "namespaceName", namespaceId: toNamespaceId("Domain.Sub") },
        payload: "Core.Sub",
      },
    ]);
  });

  it("adds, replaces, and resets namespace style annotations", () => {
    const source = `classDiagram
namespace Root {
  class User
}
%% @spatial:User x=10 y=20 w=220 h=160
`;
    const parsed = rootFixture({ hasStyle: false });
    const style = {
      fill: "#eef",
      stroke: "#48f",
      color: null,
      strokeWidth: "2px",
      strokeDasharray: null,
    };

    expect(
      translateCommands(
        [{ type: "namespace.style.set", namespaceId: toNamespaceId("Root"), style }],
        parsed.graph,
        parsed.provenance,
        source
      ).intents
    ).toEqual([
      {
        kind: "insertStatement",
        payload: "%% @style:Root fill=#eef stroke=#48f strokeWidth=2px",
        anchor: {
          kind: "afterDifferentKind",
          statement: { kind: "classSpatial", classId: toClassId("User") },
        },
      },
    ]);

    const styledSource = `${source}%% @style:Root fill=#fff
`;
    const styledParsed = rootFixture({ hasStyle: true });
    expect(
      translateCommands(
        [{ type: "namespace.style.set", namespaceId: toNamespaceId("Root"), style }],
        styledParsed.graph,
        styledParsed.provenance,
        styledSource
      ).intents
    ).toEqual([
      {
        kind: "replaceValue",
        target: { kind: "namespaceStyleProperties", namespaceId: toNamespaceId("Root") },
        payload: "fill=#eef stroke=#48f strokeWidth=2px",
      },
    ]);

    expect(
      translateCommands(
        [{ type: "namespace.style.set", namespaceId: toNamespaceId("Root"), style: null }],
        styledParsed.graph,
        styledParsed.provenance,
        styledSource
      ).intents
    ).toEqual([
      {
        kind: "deleteStatement",
        target: { kind: "namespaceStyle", namespaceId: toNamespaceId("Root") },
      },
    ]);
  });

  it("deletes a namespace by unwrapping direct members and removing its style", () => {
    const source = `classDiagram
namespace Root {
  class User
  namespace Child {
    class Account
  }
}
%% @spatial:User x=10 y=20 w=220 h=160
%% @spatial:Account x=260 y=20 w=220 h=160
%% @style:Root fill=#eef
`;
    const parsed = deleteFixture();

    expect(
      translateCommands(
        [{ type: "namespace.delete", namespaceId: toNamespaceId("Root") }],
        parsed.graph,
        parsed.provenance,
        source
      ).intents
    ).toEqual([
      {
        kind: "insertStatement",
        payload: "class User",
        anchor: {
          kind: "atBlockOpening",
          block: { kind: "diagram" },
        },
      },
      {
        kind: "insertStatement",
        payload: "namespace Child {\n  class Account\n}",
        anchor: {
          kind: "atBlockOpening",
          block: { kind: "diagram" },
        },
      },
      {
        kind: "deleteStatement",
        target: { kind: "namespace", namespaceId: toNamespaceId("Root") },
      },
      {
        kind: "deleteStatement",
        target: { kind: "namespaceStyle", namespaceId: toNamespaceId("Root") },
      },
    ]);
  });
});

describe("namespace properties validation", () => {
  it("rejects namespace rename collisions", () => {
    const parsed = collisionFixture();
    const transaction: EditorCommandTransaction = [
      { type: "namespace.name.set", namespaceId: toNamespaceId("Root"), name: "Other" },
    ];

    expect(validateTransaction(transaction, parsed.graph)).toEqual([
      { commandIndex: 0, message: 'Namespace "Other" already exists' },
    ]);
  });

  it("rejects unsupported namespace style properties", () => {
    const parsed = rootFixture({ hasStyle: false });
    const transaction: EditorCommandTransaction = [
      {
        type: "namespace.style.set",
        namespaceId: toNamespaceId("Root"),
        style: {
          fill: "#eef",
          stroke: null,
          color: null,
          strokeWidth: null,
          strokeDasharray: null,
          opacity: "0.5",
        } as never,
      },
    ];

    expect(validateTransaction(transaction, parsed.graph)).toEqual([
      { commandIndex: 0, message: 'Namespace style property "opacity" is not supported' },
    ]);
  });
});

type Fixture = {
  readonly graph: DiagramGraph;
  readonly provenance: ProvenanceIndex;
};

function rootFixture({ hasStyle }: { readonly hasStyle: boolean }): Fixture {
  const classId = toClassId("User");
  const namespaceId = toNamespaceId("Root");
  return {
    graph: graphWith({
      classes: [classNode("User", namespaceId)],
      namespaces: [namespaceNode("Root", null, hasStyle ? style("#eef", "#48f") : null)],
    }),
    provenance: provenanceWith({
      classes: [
        [
          classId,
          {
            self: span(2, 2, 2, 12),
            header: span(2, 2, 2, 12),
            body: null,
            fields: { declaredName: span(2, 8, 2, 12) },
          },
        ],
      ],
      namespaces: [
        [
          namespaceId,
          {
            self: span(1, 0, 3, 1),
            header: span(1, 0, 1, 16),
            body: span(2, 0, 2, 0),
            fields: { declaredName: span(1, 10, 1, 14) },
          },
        ],
      ],
      namespaceStyles: hasStyle
        ? [
            [
              namespaceId,
              {
                self: span(5, 0, 5, 35),
                fields: { target: span(5, 10, 5, 14), propertyList: span(5, 15, 5, 35) },
              },
            ],
          ]
        : [],
      classSpatial: [[classId, spatial(4, classId)]],
    }),
  };
}

function dottedFixture(): Fixture {
  const classId = toClassId("User");
  const parentId = toNamespaceId("Domain");
  const namespaceId = toNamespaceId("Domain.Sub");
  return {
    graph: graphWith({
      classes: [classNode("User", namespaceId)],
      namespaces: [
        namespaceNode("Domain", null, null),
        namespaceNode("Domain.Sub", parentId, null),
      ],
    }),
    provenance: provenanceWith({
      classes: [
        [
          classId,
          {
            self: span(2, 2, 2, 12),
            header: span(2, 2, 2, 12),
            body: null,
            fields: { declaredName: span(2, 8, 2, 12) },
          },
        ],
      ],
      namespaces: [
        [
          namespaceId,
          {
            self: span(1, 0, 3, 1),
            header: span(1, 0, 1, 22),
            body: span(2, 0, 2, 0),
            fields: { declaredName: span(1, 10, 1, 20) },
          },
        ],
      ],
      classSpatial: [[classId, spatial(4, classId)]],
    }),
  };
}

function deleteFixture(): Fixture {
  const rootId = toNamespaceId("Root");
  const childId = toNamespaceId("Root.Child");
  const userId = toClassId("User");
  const accountId = toClassId("Account");
  return {
    graph: graphWith({
      classes: [classNode("User", rootId), classNode("Account", childId)],
      namespaces: [
        namespaceNode("Root", null, style("#eef", null)),
        namespaceNode("Root.Child", rootId, null),
      ],
    }),
    provenance: provenanceWith({
      classes: [
        [
          userId,
          {
            self: span(2, 2, 2, 12),
            header: span(2, 2, 2, 12),
            body: null,
            fields: { declaredName: span(2, 8, 2, 12) },
          },
        ],
        [
          accountId,
          {
            self: span(4, 4, 4, 17),
            header: span(4, 4, 4, 17),
            body: null,
            fields: { declaredName: span(4, 10, 4, 17) },
          },
        ],
      ],
      namespaces: [
        [
          rootId,
          {
            self: span(1, 0, 6, 1),
            header: span(1, 0, 1, 16),
            body: span(2, 0, 5, 0),
            fields: { declaredName: span(1, 10, 1, 14) },
          },
        ],
        [
          childId,
          {
            self: span(3, 2, 5, 3),
            header: span(3, 2, 3, 19),
            body: span(4, 0, 4, 0),
            fields: { declaredName: span(3, 12, 3, 17) },
          },
        ],
      ],
      namespaceStyles: [
        [
          rootId,
          {
            self: span(9, 0, 9, 24),
            fields: { target: span(9, 10, 9, 14), propertyList: span(9, 15, 9, 24) },
          },
        ],
      ],
      classSpatial: [
        [userId, spatial(7, userId)],
        [accountId, spatial(8, accountId)],
      ],
    }),
  };
}

function collisionFixture(): Fixture {
  const rootId = toNamespaceId("Root");
  const otherId = toNamespaceId("Other");
  return {
    graph: graphWith({
      classes: [classNode("User", rootId), classNode("Account", otherId)],
      namespaces: [namespaceNode("Root", null, null), namespaceNode("Other", null, null)],
    }),
    provenance: provenanceWith({}),
  };
}

function graphWith(input: {
  readonly classes: readonly ClassNode[];
  readonly namespaces: readonly NamespaceNode[];
}): DiagramGraph {
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map(input.classes.map((node) => [node.id, node])),
    namespaces: new Map(input.namespaces.map((node) => [node.id, node])),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function classNode(name: string, parentNamespaceId: ClassNode["parentNamespaceId"]): ClassNode {
  return {
    kind: "class",
    id: toClassId(name),
    name,
    label: name,
    genericType: null,
    annotation: null,
    parentNamespaceId,
    spatial: null,
    attributes: [],
    methods: [],
    lollipopInterfaces: [],
    directStyle: null,
    interaction: null,
  };
}

function namespaceNode(
  name: string,
  parentNamespaceId: NamespaceNode["parentNamespaceId"],
  namespaceStyle: NamespaceNode["style"]
): NamespaceNode {
  return {
    kind: "namespace",
    id: toNamespaceId(name),
    name,
    label: name.slice(name.lastIndexOf(".") + 1),
    parentNamespaceId,
    style: namespaceStyle,
  };
}

function style(fill: string | null, stroke: string | null): NamespaceNode["style"] {
  return { fill, stroke, strokeWidth: null, strokeDasharray: null, color: null };
}

function provenanceWith(
  input: Partial<{
    readonly classes: readonly (readonly [ClassNode["id"], ClassRecord])[];
    readonly namespaces: readonly (readonly [NamespaceNode["id"], NamespaceRecord])[];
    readonly namespaceStyles: readonly (readonly [NamespaceNode["id"], NamespaceStyleRecord])[];
    readonly classSpatial: readonly (readonly [ClassNode["id"], SpatialRecord])[];
  }>
): ProvenanceIndex {
  return {
    diagram: {
      self: span(0, 0, 10, 0),
      header: span(0, 0, 0, 12),
      body: span(1, 0, 10, 0),
      direction: null,
      configDirectives: [],
    },
    classes: new Map(input.classes ?? []),
    namespaces: new Map(input.namespaces ?? []),
    namespaceStyles: new Map(input.namespaceStyles ?? []),
    blockMembers: new Map(),
    shortMembers: new Map(),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map(input.classSpatial ?? []),
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}

function spatial(line: number, classId: ClassNode["id"]): SpatialRecord {
  return {
    self: span(line, 0, line, 45),
    fields: {
      target: span(line, 12, line, 12 + classId.length),
      x: span(line, 0, line, 0),
      y: span(line, 0, line, 0),
      w: span(line, 0, line, 0),
      h: span(line, 0, line, 0),
    },
  };
}

function span(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number
): SourceSpan {
  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  };
}
