/**
 * @fileoverview Translates namespace rename, style annotation edits, and delete-as-unwrap.
 */

import type { EditorCommandOf } from "../../../../View/commands";
import { toNamespaceId, type NamespaceId } from "../../../../shared/ids";
import { STYLE_PROPERTIES, type StyleProperties } from "../../../../shared/style";
import type { DiagramGraph } from "../../../model/diagramGraph";
import { readIdentity, spellNamespaceIdentity } from "../../../model/identitySpelling";
import type { ProvenanceIndex, SourceSpan } from "../../../model/provenanceIndex";
import { toNamespaceRenamePairs } from "../../namespaceRenameCascade";
import type { NamespaceRenamePair } from "../../namespaceRenameCascade";
import type { TranslateContext } from "../../translateContext";
import {
  anchorAfterKindList,
  anchorAfterPredecessorOf,
  anchorBlockOpening,
  asDifferentKind,
  asSameKind,
  type StatementKind,
  STATEMENT_KINDS,
} from "../../anchors/statementAnchors";
import { movedStatementPayload } from "../../placement/moveStatementSlice";
import type { BlockRef, StatementAnchor, StatementRef, WriteIntent } from "../../writeIntent";

/**
 * Makes two groups of writes — only for namespace identities changed by the rename:
 *
 * 1. namespace name **value**, for the renamed namespace and every descendant whose written
 *    namespace name changes
 *    - in place
 * 2. namespace style target **value**, for every renamed namespace with a namespace style
 *    annotation statement
 *    - in place
 *
 * No-op when the namespace is missing or its resulting namespace name is unchanged.
 */
export function translateNamespaceNameSet(
  command: EditorCommandOf<"namespace.name.set">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string,
  context: TranslateContext
): WriteIntent[] {
  const renamed = toNamespaceNameSetRenamePairs(command, graph);
  for (const pair of renamed) {
    context.recordNamespaceRenamed(pair.from, pair.to);
  }

  return renamed.flatMap((pair): WriteIntent[] => [
    ...toNamespaceDeclarationRenameIntent(pair, command.namespaceId, provenance, sourceText),
    ...toNamespaceStyleTargetRenameIntent(pair, provenance),
  ]);
}

/**
 * Makes one of three write options:
 *
 * a. namespace style annotation statement exists and the new style is null or has no
 *    non-null properties → namespace style annotation **statement** deleted
 * b. namespace style annotation statement exists and the new style has a non-null property
 *    → namespace style properties **value**
 *    - in place
 * c. otherwise → namespace style annotation **statement**, in **diagram body** (anchored at
 *    first match)
 *    - after the latest namespace style annotation statement
 *    - after the latest spatial annotation statement
 *    - after the latest statement of any kind
 *    - at block opening
 *
 * No-op when no namespace style annotation statement exists and the new style is null or has
 * no non-null properties.
 */
export function translateNamespaceStyleSet(
  command: EditorCommandOf<"namespace.style.set">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex
): WriteIntent[] {
  const record = provenance.namespaceStyles.get(command.namespaceId);

  if (command.style === null) {
    return record
      ? [
          {
            kind: "deleteStatement",
            target: { kind: "namespaceStyle", namespaceId: command.namespaceId },
          },
        ]
      : [];
  }

  const properties = composeNamespaceStyleProperties(command.style);
  if (properties === "") {
    return record
      ? [
          {
            kind: "deleteStatement",
            target: { kind: "namespaceStyle", namespaceId: command.namespaceId },
          },
        ]
      : [];
  }

  if (record) {
    return [
      {
        kind: "replaceValue",
        target: { kind: "namespaceStyleProperties", namespaceId: command.namespaceId },
        payload: properties,
      },
    ];
  }

  return [
    {
      kind: "insertStatement",
      payload: `%% @style:${spellNamespaceIdentity(command.namespaceId)} ${properties}`,
      anchor: toNamespaceStyleAnchor(graph, provenance),
    },
  ];
}

/**
 * Makes four groups of writes:
 *
 * 1. class declaration **statement** (source block, verbatim), in the parent **namespace
 *    body**, or **diagram body** if no parent namespace, for every direct class (anchored at
 *    first match)
 *    - after the latest statement matching the first moved declaration kind before the
 *      deleted namespace declaration statement
 *    - after the latest statement of any kind before the deleted namespace declaration
 *      statement
 *    - at block opening
 * 2. namespace declaration **statement** (source block, verbatim), in the parent **namespace
 *    body**, or **diagram body** if no parent namespace, for every direct namespace (anchored
 *    at first match)
 *    - after the latest statement matching the first moved declaration kind before the
 *      deleted namespace declaration statement
 *    - after the latest statement of any kind before the deleted namespace declaration
 *      statement
 *    - at block opening
 * 3. namespace declaration **statement** deleted
 * 4. namespace style annotation **statement** deleted, when it exists
 */
export function translateNamespaceDelete(
  command: EditorCommandOf<"namespace.delete">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string
): WriteIntent[] {
  const directMembers = toDirectMemberStatements(command.namespaceId, graph, provenance);
  const anchor =
    directMembers.length === 0
      ? null
      : toNamespaceDeleteAnchor(command.namespaceId, directMembers[0].kind, graph, provenance);

  return [
    ...directMembers.map(
      (statement): WriteIntent => ({
        kind: "insertStatement",
        payload: movedStatementPayload(statement, provenance, sourceText, 0),
        anchor: requireAnchor(anchor),
      })
    ),
    { kind: "deleteStatement", target: { kind: "namespace", namespaceId: command.namespaceId } },
    ...(provenance.namespaceStyles.has(command.namespaceId)
      ? [
          {
            kind: "deleteStatement" as const,
            target: { kind: "namespaceStyle" as const, namespaceId: command.namespaceId },
          },
        ]
      : []),
  ];
}

function toNamespaceNameSetRenamePairs(
  command: EditorCommandOf<"namespace.name.set">,
  graph: DiagramGraph
): readonly NamespaceRenamePair[] {
  const current = graph.namespaces.get(command.namespaceId);
  if (!current) return [];
  const nextId = toNamespaceId(
    current.parentNamespaceId
      ? `${current.parentNamespaceId}.${command.name.trim()}`
      : command.name.trim()
  );
  return toNamespaceRenamePairs(command.namespaceId, nextId, graph);
}

function toNamespaceDeclarationRenameIntent(
  pair: NamespaceRenamePair,
  renamedNamespaceId: NamespaceId,
  provenance: ProvenanceIndex,
  sourceText: string
): WriteIntent[] {
  const record = provenance.namespaces.get(pair.from);
  if (!record) return [];

  const sourceName = readIdentity(sliceSpan(sourceText, record.fields.declaredName));
  if (sourceName === pair.from) {
    return [
      {
        kind: "replaceValue",
        target: { kind: "namespaceName", namespaceId: pair.from },
        payload: spellNamespaceIdentity(pair.to),
      },
    ];
  }
  if (pair.from === renamedNamespaceId) {
    return [
      {
        kind: "replaceValue",
        target: { kind: "namespaceName", namespaceId: pair.from },
        payload: spellNamespaceIdentity(lastNamespaceSegment(pair.to)),
      },
    ];
  }
  return [];
}

function toNamespaceStyleTargetRenameIntent(
  pair: NamespaceRenamePair,
  provenance: ProvenanceIndex
): WriteIntent[] {
  return provenance.namespaceStyles.has(pair.from)
    ? [
        {
          kind: "replaceValue",
          target: { kind: "namespaceStyleTarget", namespaceId: pair.from },
          payload: spellNamespaceIdentity(pair.to),
        },
      ]
    : [];
}

function composeNamespaceStyleProperties(style: StyleProperties): string {
  return STYLE_PROPERTIES.flatMap(({ name }) => {
    const value = style[name];
    return value === null ? [] : [`${name}=${value}`];
  }).join(" ");
}

function toNamespaceStyleAnchor(graph: DiagramGraph, provenance: ProvenanceIndex): StatementAnchor {
  const diagramScope: BlockRef = { kind: "diagram" };
  return (
    asSameKind(anchorAfterKindList(graph, provenance, diagramScope, ["namespaceStyle"])) ??
    asDifferentKind(anchorAfterKindList(graph, provenance, diagramScope, ["classSpatial"])) ??
    asDifferentKind(anchorAfterKindList(graph, provenance, diagramScope, STATEMENT_KINDS)) ??
    anchorBlockOpening(diagramScope)
  );
}

function toDirectMemberStatements(
  namespaceId: NamespaceId,
  graph: DiagramGraph,
  provenance: ProvenanceIndex
): readonly StatementRef[] {
  return [
    ...[...graph.classes.values()].flatMap((classNode): StatementRef[] =>
      classNode.parentNamespaceId === namespaceId && provenance.classes.has(classNode.id)
        ? [{ kind: "class", classId: classNode.id }]
        : []
    ),
    ...[...graph.namespaces.values()].flatMap((namespaceNode): StatementRef[] =>
      namespaceNode.parentNamespaceId === namespaceId && provenance.namespaces.has(namespaceNode.id)
        ? [{ kind: "namespace", namespaceId: namespaceNode.id }]
        : []
    ),
  ].sort((left, right) =>
    compareSpans(statementSourceSpan(left, provenance), statementSourceSpan(right, provenance))
  );
}

function toNamespaceDeleteAnchor(
  namespaceId: NamespaceId,
  sameKind: StatementKind,
  graph: DiagramGraph,
  provenance: ProvenanceIndex
): StatementAnchor {
  const namespaceRecord = provenance.namespaces.get(namespaceId);
  const namespaceNode = graph.namespaces.get(namespaceId);
  const parentBlock = toNamespaceBlock(namespaceNode?.parentNamespaceId ?? null);
  const before = requireSpan(namespaceRecord?.self);

  return (
    asSameKind(anchorAfterPredecessorOf(graph, provenance, parentBlock, before, [sameKind])) ??
    asDifferentKind(
      anchorAfterPredecessorOf(graph, provenance, parentBlock, before, STATEMENT_KINDS)
    ) ??
    anchorBlockOpening(parentBlock)
  );
}

function requireAnchor(anchor: StatementAnchor | null): StatementAnchor {
  if (!anchor) throw new Error("Missing namespace delete insertion anchor");
  return anchor;
}

function statementSourceSpan(statement: StatementRef, provenance: ProvenanceIndex): SourceSpan {
  switch (statement.kind) {
    case "class":
      return requireSpan(provenance.classes.get(statement.classId)?.self);
    case "namespace":
      return requireSpan(provenance.namespaces.get(statement.namespaceId)?.self);
    default:
      throw new Error(`Unsupported namespace member statement ${statement.kind}`);
  }
}

function compareSpans(left: SourceSpan, right: SourceSpan): number {
  return (
    left.start.line - right.start.line ||
    left.start.character - right.start.character ||
    left.end.line - right.end.line ||
    left.end.character - right.end.character
  );
}

function requireSpan(span: SourceSpan | undefined): SourceSpan {
  if (!span) throw new Error("Missing provenance for namespace member");
  return span;
}

function toNamespaceBlock(namespaceId: NamespaceId | null): BlockRef {
  return namespaceId === null ? { kind: "diagram" } : { kind: "namespace", namespaceId };
}

function lastNamespaceSegment(namespaceId: NamespaceId): string {
  return namespaceId.slice(namespaceId.lastIndexOf(".") + 1);
}

function sliceSpan(sourceText: string, span: SourceSpan): string {
  const lines = sourceText.split("\n");
  if (span.start.line === span.end.line) {
    return (lines[span.start.line] ?? "").slice(span.start.character, span.end.character);
  }
  return "";
}
