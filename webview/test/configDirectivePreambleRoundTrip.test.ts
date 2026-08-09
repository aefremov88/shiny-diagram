import { describe, expect, it } from "vitest";
import type { EditorCommandTransaction } from "../src/View/commands";
import type { ClassNode } from "../src/Controller/model/diagramGraph";
import type { SourceEdit, SourcePosition } from "../src/Controller/model/sourceEdit";
import { parseDiagram } from "../src/Controller/parse";
import { resolveIntents } from "../src/Controller/resolve";
import { translateCommands } from "../src/Controller/translate";
import { toClassId } from "../src/shared/ids";

const firstDirective = '%%{init: {"class": {"hideEmptyMembersBox": true}}}%%';
const secondDirective = '%%{init: {"class": {"hierarchicalNamespaces": false}}}%%';

describe("config-directive preamble write-back", () => {
  it.each([
    [
      "namespace",
      [{ type: "namespace.create", initialClassIds: [], initialNamespaceIds: [] }] as const,
      "namespace ",
    ],
    [
      "class",
      [
        {
          type: "class.create",
          parentNamespaceId: null,
          spatial: { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } },
        },
      ] as const,
      "class ",
    ],
    [
      "note pair",
      [
        {
          type: "note.create",
          text: "First",
          spatial: { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } },
          attachedToClassId: null,
        },
      ] as const,
      'note "First"',
    ],
  ])("inserts the first %s below one directive", (_name, transaction, fragment) => {
    const source = `classDiagram\n${firstDirective}\n`;
    const result = dispatch(source, transaction);

    expect(result.split("\n")[1]).toBe(firstDirective);
    expect(result.indexOf(fragment)).toBeGreaterThan(result.indexOf(firstDirective));
  });

  it("inserts a first relationship below a directive", () => {
    const source = `classDiagram\n${firstDirective}\n`;
    const parsed = parseUsable(source);
    const sourceId = toClassId("Source");
    const targetId = toClassId("Target");
    const graph = {
      ...parsed.graph,
      classes: new Map([
        [sourceId, implicitClass(sourceId)],
        [targetId, implicitClass(targetId)],
      ]),
    };
    const transaction: EditorCommandTransaction = [
      {
        type: "relationship.create",
        source: { classId: sourceId, endpointKind: "none", multiplicity: null },
        target: { classId: targetId, endpointKind: "arrow", multiplicity: null },
        lineKind: "solid",
        label: null,
      },
    ];
    const translated = translateCommands(transaction, graph, parsed.provenance, source);
    const result = applyEdits(
      source,
      resolveIntents(translated.intents, parsed.provenance, source)
    );

    expect(result.split("\n")[1]).toBe(firstDirective);
    expect(result.indexOf("Source")).toBeGreaterThan(result.indexOf(firstDirective));
  });

  it("inserts below both directives and preserves both byte-identically", () => {
    const source = `classDiagram
${firstDirective}
${secondDirective}
`;
    const result = dispatch(source, [
      { type: "namespace.create", initialClassIds: [], initialNamespaceIds: [] },
    ]);

    expect(result.split("\n").slice(1, 3)).toEqual([firstDirective, secondDirective]);
    expect(result.indexOf("namespace ")).toBeGreaterThan(result.indexOf(secondDirective));
  });

  it("uses the latest source statement when a directive appears between content", () => {
    const source = `classDiagram
class Existing
${firstDirective}
`;
    const result = dispatch(source, [
      {
        type: "note.create",
        text: "Later",
        spatial: { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } },
        attachedToClassId: null,
      },
    ]);

    expect(result.split("\n")[2]).toBe(firstDirective);
    expect(result.indexOf('note "Later"')).toBeGreaterThan(result.indexOf(firstDirective));
  });

  it("keeps block-opening behavior when directives are absent", () => {
    const result = dispatch(`classDiagram\n`, [
      { type: "namespace.create", initialClassIds: [], initialNamespaceIds: [] },
    ]);

    expect(result.startsWith("classDiagram\n  namespace ")).toBe(true);
  });

  it("preserves directives through a Generate-style spatial write", () => {
    const source = `classDiagram
${firstDirective}
class User
`;
    const result = dispatch(source, [
      {
        type: "class.spatial.set",
        classId: toClassId("User"),
        spatial: { position: { x: 10, y: 20 }, size: { width: 100, height: 80 } },
      },
    ]);

    expect(result.split("\n").filter((line) => line.includes("%%{init:"))).toEqual([
      firstDirective,
    ]);
  });
});

function dispatch(source: string, transaction: EditorCommandTransaction): string {
  const parsed = parseUsable(source);
  const translated = translateCommands(transaction, parsed.graph, parsed.provenance, source);
  return applyEdits(source, resolveIntents(translated.intents, parsed.provenance, source));
}

function parseUsable(source: string) {
  const result = parseDiagram(source);
  if (result.status === "invalidSyntax") {
    throw new Error(`Expected usable parse: ${JSON.stringify(result.diagnostics)}`);
  }
  return result;
}

function implicitClass(id: ReturnType<typeof toClassId>): ClassNode {
  return {
    id,
    label: null,
    annotation: null,
    parentNamespaceId: null,
    spatial: null,
    attributes: [],
    methods: [],
    lollipopInterfaces: [],
    directStyle: null,
    interaction: null,
  };
}

function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  return [...edits]
    .sort(
      (left, right) => positionToOffset(source, right.start) - positionToOffset(source, left.start)
    )
    .reduce(
      (nextSource, edit) =>
        `${nextSource.slice(0, positionToOffset(source, edit.start))}${edit.replacementText}${nextSource.slice(
          positionToOffset(source, edit.end)
        )}`,
      source
    );
}

function positionToOffset(source: string, position: SourcePosition): number {
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    const nextLf = source.indexOf("\n", offset);
    if (nextLf === -1) return source.length;
    offset = nextLf + 1;
  }
  return offset + position.character;
}
